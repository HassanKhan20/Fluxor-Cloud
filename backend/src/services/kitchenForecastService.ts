// Kitchen forecasting service.
//
// Pure functions that translate (recipes × meal plans) into vendor-grouped
// purchase orders. No database writes here — the controller wraps this in a
// transaction. Easy to unit-test.

import { prisma } from '../lib/prisma';

export interface IngredientDemand {
    productId: string;
    productName: string;
    unit: string;
    demand: number;        // Total qty needed for the week
    onHand: number;        // Current inventory snapshot
    safetyStock: number;   // parLevel ?? 0
    rawOrderQty: number;   // demand - onHand + safety
    orderQty: number;      // Rounded up to caseSize
    caseSize: number;
    unitCost: number;
    lineTotal: number;
    vendorId: string | null;
    vendorName: string | null;
}

export interface VendorPurchaseDraft {
    vendorId: string;
    vendorName: string;
    contactEmail: string | null;
    autoSendEnabled: boolean;
    minOrderValue: number | null;
    items: IngredientDemand[];
    totalAmount: number;
    meetsMinimum: boolean;
}

export interface ForecastResult {
    storeId: string;
    weekStart: Date;
    weekEnd: Date;
    plannedServings: number;
    bufferApplied: number;
    drafts: VendorPurchaseDraft[];
    skippedItems: { productId: string; productName: string; reason: string }[];
}

/**
 * Build the demand forecast for a single store + week.
 *
 * Pure-ish: reads from the DB, returns drafts. Does NOT write any rows.
 * The caller (cron / endpoint) decides what to persist.
 */
export async function forecastWeeklyDemand(
    storeId: string,
    weekStart: Date,
): Promise<ForecastResult> {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    // Pull store config (buffer, etc)
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new Error(`Store ${storeId} not found`);
    const buffer = store.servingsBuffer ?? 0;

    // 1. Read meal plans in [weekStart, weekEnd], with their menu items + recipes
    const plans = await prisma.mealPlan.findMany({
        where: {
            storeId,
            date: { gte: weekStart, lte: weekEnd },
        },
        include: {
            menuItem: {
                include: {
                    recipes: {
                        include: { product: true },
                    },
                },
            },
        },
    });

    // 2. Aggregate demand by ingredient
    const demandMap = new Map<string, { product: any; totalQty: number; unit: string }>();
    let plannedTotalServings = 0;

    for (const plan of plans) {
        const servings = plan.plannedServings * (1 + buffer);
        plannedTotalServings += plan.plannedServings;
        for (const recipe of plan.menuItem.recipes) {
            const key = recipe.productId;
            const qty = recipe.qtyPerServing * servings;
            const existing = demandMap.get(key);
            if (existing) {
                existing.totalQty += qty;
            } else {
                demandMap.set(key, { product: recipe.product, totalQty: qty, unit: recipe.unit });
            }
        }
    }

    // 3. Build per-ingredient orders, group by vendor
    const skipped: { productId: string; productName: string; reason: string }[] = [];
    const allItems: IngredientDemand[] = [];

    // Pull on-hand for all relevant products in one query
    const productIds = Array.from(demandMap.keys());
    const snapshots = productIds.length > 0
        ? await prisma.inventorySnapshot.findMany({
            where: { productId: { in: productIds } },
            orderBy: { snapshotDate: 'desc' },
        })
        : [];
    const latestOnHand = new Map<string, number>();
    for (const s of snapshots) {
        if (!latestOnHand.has(s.productId)) latestOnHand.set(s.productId, s.quantityOnHand);
    }

    for (const [productId, { product, totalQty, unit }] of demandMap) {
        const onHand = latestOnHand.get(productId) ?? product.initialStock ?? 0;
        const safety = product.parLevel ?? 0;
        const rawOrderQty = Math.max(0, totalQty - onHand + safety);
        const caseSize = product.caseSize ?? 1;
        const orderQty = caseSize > 0
            ? Math.ceil(rawOrderQty / caseSize) * caseSize
            : rawOrderQty;

        if (orderQty === 0) continue;

        if (!product.vendorRefId && !product.vendor) {
            skipped.push({
                productId,
                productName: product.name,
                reason: 'No vendor assigned',
            });
            continue;
        }

        const unitCost = product.costPrice ?? 0;
        const lineTotal = orderQty * unitCost;

        allItems.push({
            productId,
            productName: product.name,
            unit,
            demand: totalQty,
            onHand,
            safetyStock: safety,
            rawOrderQty,
            orderQty,
            caseSize,
            unitCost,
            lineTotal,
            vendorId: product.vendorRefId ?? null,
            vendorName: product.vendor ?? null,
        });
    }

    // 4. Group by vendorId (preferred) or vendor name, fetch vendor metadata
    const vendorIds = Array.from(new Set(allItems.map(i => i.vendorId).filter(Boolean) as string[]));
    const vendors = vendorIds.length > 0
        ? await prisma.vendor.findMany({ where: { id: { in: vendorIds }, storeId } })
        : [];
    const vendorMap = new Map(vendors.map(v => [v.id, v]));

    const draftsByKey = new Map<string, VendorPurchaseDraft>();
    for (const item of allItems) {
        const key = item.vendorId ?? `name:${item.vendorName}`;
        let draft = draftsByKey.get(key);
        if (!draft) {
            const vendor = item.vendorId ? vendorMap.get(item.vendorId) : null;
            draft = {
                vendorId: item.vendorId ?? '',
                vendorName: vendor?.name ?? item.vendorName ?? 'Unknown vendor',
                contactEmail: vendor?.contactEmail ?? null,
                autoSendEnabled: vendor?.autoSendEnabled ?? false,
                minOrderValue: vendor?.minOrderValue ?? null,
                items: [],
                totalAmount: 0,
                meetsMinimum: true,
            };
            draftsByKey.set(key, draft);
        }
        draft.items.push(item);
        draft.totalAmount += item.lineTotal;
    }

    // Compute meetsMinimum after totals are known
    const drafts = Array.from(draftsByKey.values()).map(d => ({
        ...d,
        meetsMinimum: d.minOrderValue == null || d.totalAmount >= d.minOrderValue,
    }));

    return {
        storeId,
        weekStart,
        weekEnd,
        plannedServings: plannedTotalServings,
        bufferApplied: buffer,
        drafts,
        skippedItems: skipped,
    };
}

/**
 * Persist a forecast result as DRAFT purchase orders.
 * Returns the created PO ids.
 */
export async function persistDraftPurchaseOrders(
    forecast: ForecastResult,
    actorId: string = 'system',
): Promise<string[]> {
    const created: string[] = [];

    for (const draft of forecast.drafts) {
        // Skip drafts with no real vendor row (we need a vendorId FK)
        if (!draft.vendorId) continue;
        // Skip if zero items (defensive)
        if (draft.items.length === 0) continue;

        const po = await prisma.purchaseOrder.create({
            data: {
                storeId: forecast.storeId,
                vendorId: draft.vendorId,
                weekStart: forecast.weekStart,
                weekEnd: forecast.weekEnd,
                status: 'DRAFT',
                totalAmount: draft.totalAmount,
                items: {
                    create: draft.items.map(it => ({
                        productId: it.productId,
                        productName: it.productName,
                        qty: it.orderQty,
                        unit: it.unit,
                        unitCost: it.unitCost,
                        lineTotal: it.lineTotal,
                        caseSize: it.caseSize,
                    })),
                },
                events: {
                    create: {
                        type: 'DRAFTED',
                        actorId,
                        payload: JSON.stringify({
                            plannedServings: forecast.plannedServings,
                            bufferApplied: forecast.bufferApplied,
                            itemCount: draft.items.length,
                        }),
                    },
                },
            },
        });
        created.push(po.id);
    }

    return created;
}

/**
 * Run the full weekly forecast for every kitchen-mode store and persist drafts.
 * Used by the weekly cron and by the manual "generate now" endpoint.
 */
export async function runWeeklyForecastForAllStores(referenceDate: Date = new Date()): Promise<{
    storesProcessed: number;
    draftsCreated: number;
    errors: { storeId: string; error: string }[];
}> {
    const stores = await prisma.store.findMany({
        where: { kitchenMode: true },
        select: { id: true, weeklyOrderDay: true },
    });

    let draftsCreated = 0;
    const errors: { storeId: string; error: string }[] = [];

    for (const store of stores) {
        try {
            // Compute the upcoming week start (next occurrence of weeklyOrderDay)
            const weekStart = nextWeekStart(referenceDate, store.weeklyOrderDay);
            const forecast = await forecastWeeklyDemand(store.id, weekStart);
            const ids = await persistDraftPurchaseOrders(forecast, 'system');
            draftsCreated += ids.length;
        } catch (err: any) {
            errors.push({ storeId: store.id, error: err.message ?? String(err) });
        }
    }

    return { storesProcessed: stores.length, draftsCreated, errors };
}

/**
 * Returns the next occurrence of `targetDow` (0=Sun..6=Sat) on or after `from`.
 * Time component is normalized to UTC midnight so the @db.Date column stores cleanly.
 */
export function nextWeekStart(from: Date, targetDow: number): Date {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const currentDow = d.getUTCDay();
    const daysUntil = (targetDow - currentDow + 7) % 7;
    d.setUTCDate(d.getUTCDate() + (daysUntil === 0 ? 7 : daysUntil));
    return d;
}
