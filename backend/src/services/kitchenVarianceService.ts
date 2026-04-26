// Friday reconciliation — theoretical (recipe × actual servings) vs. actual
// (counted on hand at end of week). Surfaces drift so recipes can be re-tuned.

import { prisma } from '../lib/prisma';

export interface VarianceRow {
    productId: string;
    productName: string;
    unit: string;
    theoreticalQty: number;
    actualQty: number;
    variance: number;
    variancePct: number;
}

export interface PhysicalCount {
    productId: string;
    countedQty: number;
}

/**
 * Compute variance for a (store, week) given a set of physical counts.
 * Theoretical consumption = sum over week of (recipe.qtyPerServing * mealPlan.actualServings).
 * Actual consumption     = previousOnHand + receivedThisWeek - countedQty.
 *
 * Persists one RecipeVariance row per ingredient (upsert).
 */
export async function computeAndSaveVariance(
    storeId: string,
    weekStart: Date,
    weekEnd: Date,
    counts: PhysicalCount[],
): Promise<VarianceRow[]> {
    const plans = await prisma.mealPlan.findMany({
        where: { storeId, date: { gte: weekStart, lte: weekEnd } },
        include: { menuItem: { include: { recipes: true } } },
    });

    // Theoretical: recipe × actualServings (fall back to plannedServings)
    const theoreticalByProduct = new Map<string, { qty: number; unit: string; productId: string }>();
    for (const plan of plans) {
        const servings = plan.actualServings ?? plan.plannedServings;
        for (const r of plan.menuItem.recipes) {
            const ex = theoreticalByProduct.get(r.productId);
            const qty = r.qtyPerServing * servings;
            if (ex) ex.qty += qty;
            else theoreticalByProduct.set(r.productId, { qty, unit: r.unit, productId: r.productId });
        }
    }

    // Actual: snapshot at start of week, plus received PO items, minus counted quantity
    const productIds = counts.map(c => c.productId);
    const products = productIds.length > 0
        ? await prisma.product.findMany({ where: { id: { in: productIds } } })
        : [];
    const productMap = new Map(products.map(p => [p.id, p]));

    // Latest snapshot before the week start (= week-start on hand)
    const startSnapshots = productIds.length > 0
        ? await prisma.inventorySnapshot.findMany({
            where: {
                productId: { in: productIds },
                snapshotDate: { lte: weekStart },
            },
            orderBy: { snapshotDate: 'desc' },
        })
        : [];
    const startOnHand = new Map<string, number>();
    for (const s of startSnapshots) {
        if (!startOnHand.has(s.productId)) startOnHand.set(s.productId, s.quantityOnHand);
    }

    // Received this week from PurchaseOrderItems whose PO was RECEIVED in [weekStart, weekEnd]
    const receivedItems = productIds.length > 0
        ? await prisma.purchaseOrderItem.findMany({
            where: {
                productId: { in: productIds },
                purchaseOrder: {
                    storeId,
                    status: 'RECEIVED',
                    weekStart: { gte: weekStart, lte: weekEnd },
                },
            },
        })
        : [];
    const receivedByProduct = new Map<string, number>();
    for (const r of receivedItems) {
        receivedByProduct.set(r.productId, (receivedByProduct.get(r.productId) ?? 0) + r.qty);
    }

    const rows: VarianceRow[] = [];
    for (const c of counts) {
        const prod = productMap.get(c.productId);
        if (!prod) continue;
        const theoretical = theoreticalByProduct.get(c.productId);
        const startQty = startOnHand.get(c.productId) ?? prod.initialStock ?? 0;
        const received = receivedByProduct.get(c.productId) ?? 0;
        const actualQty = startQty + received - c.countedQty;
        const theoreticalQty = theoretical?.qty ?? 0;
        const unit = theoretical?.unit ?? prod.unit ?? 'ea';

        const variance = actualQty - theoreticalQty;
        const variancePct = theoreticalQty > 0 ? variance / theoreticalQty : 0;

        await prisma.recipeVariance.upsert({
            where: {
                storeId_productId_weekStart: {
                    storeId,
                    productId: c.productId,
                    weekStart,
                },
            },
            update: {
                theoreticalQty,
                actualQty,
                variance,
                variancePct,
                weekEnd,
            },
            create: {
                storeId,
                productId: c.productId,
                weekStart,
                weekEnd,
                theoreticalQty,
                actualQty,
                variance,
                variancePct,
            },
        });

        rows.push({
            productId: c.productId,
            productName: prod.name,
            unit,
            theoreticalQty,
            actualQty,
            variance,
            variancePct,
        });
    }

    rows.sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
    return rows;
}
