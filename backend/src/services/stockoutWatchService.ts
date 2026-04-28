// Stockout prediction service.
//
// For each ingredient: how many days until we run out, given recent consumption
// rate AND upcoming meal-plan demand, compared against the vendor lead time.
//
// Core formula:
//   on_hand / max(historical_daily_rate, planned_daily_demand) = days_until_stockout
//   urgency = compare days_until_stockout to vendor.leadTimeDays + safety_buffer

import { prisma } from '../lib/prisma';

export type StockoutUrgency = 'critical' | 'warning' | 'watch' | 'ok';

export interface StockoutRow {
    productId: string;
    productName: string;
    unit: string | null;
    onHand: number;
    historicalDailyRate: number;       // avg qty consumed per day, last 14 days
    plannedDailyDemand: number;        // avg qty per day forecasted from upcoming MealPlan
    effectiveDailyDemand: number;      // max of the two — what we'll actually use
    daysUntilStockout: number;         // rounded to 1 decimal
    leadTimeDays: number;
    urgency: StockoutUrgency;
    vendorName: string | null;
    vendorRefId: string | null;
}

const HISTORY_WINDOW_DAYS = 14;
const FORECAST_WINDOW_DAYS = 7;

export async function computeStockoutWatch(storeId: string): Promise<StockoutRow[]> {
    const now = new Date();
    const historyStart = new Date(now);
    historyStart.setUTCDate(historyStart.getUTCDate() - HISTORY_WINDOW_DAYS);

    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const forecastEnd = new Date(todayUtc);
    forecastEnd.setUTCDate(forecastEnd.getUTCDate() + FORECAST_WINDOW_DAYS);

    // 1. Pull all active products
    const products = await prisma.product.findMany({
        where: { storeId, isActive: true },
        include: {
            inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
            vendorRef: true,
        },
    });

    // 2. Pull recent consumption events for daily-rate calculation
    const events = await prisma.consumptionEvent.findMany({
        where: { storeId, recordedAt: { gte: historyStart } },
    });
    const consumptionByProduct = new Map<string, number>();
    for (const e of events) {
        consumptionByProduct.set(e.productId, (consumptionByProduct.get(e.productId) ?? 0) + e.qty);
    }

    // 3. Pull upcoming meal plans + recipes for forward-looking demand
    const upcomingPlans = await prisma.mealPlan.findMany({
        where: { storeId, date: { gte: todayUtc, lte: forecastEnd } },
        include: { menuItem: { include: { recipes: true } } },
    });
    const plannedDemandByProduct = new Map<string, number>();
    for (const plan of upcomingPlans) {
        const servings = plan.plannedServings;
        for (const r of plan.menuItem.recipes) {
            const cur = plannedDemandByProduct.get(r.productId) ?? 0;
            plannedDemandByProduct.set(r.productId, cur + r.qtyPerServing * servings);
        }
    }

    const rows: StockoutRow[] = [];
    for (const p of products) {
        // Skip ingredients with no real consumption signal at all
        const consumed = consumptionByProduct.get(p.id) ?? 0;
        const planned = plannedDemandByProduct.get(p.id) ?? 0;
        if (consumed === 0 && planned === 0) continue;

        const onHand = p.inventorySnapshots[0]?.quantityOnHand ?? p.initialStock ?? 0;
        const historicalDailyRate = consumed / HISTORY_WINDOW_DAYS;
        const plannedDailyDemand = planned / Math.max(FORECAST_WINDOW_DAYS, 1);
        const effective = Math.max(historicalDailyRate, plannedDailyDemand);
        const daysUntil = effective > 0 ? onHand / effective : Number.POSITIVE_INFINITY;

        const leadTimeDays = p.leadTimeDays ?? p.vendorRef?.leadTimeDays ?? 2;
        const urgency: StockoutUrgency =
            daysUntil <= leadTimeDays           ? 'critical' :
            daysUntil <= leadTimeDays + 2       ? 'warning'  :
            daysUntil <= leadTimeDays + 5       ? 'watch'    :
                                                  'ok';

        rows.push({
            productId: p.id,
            productName: p.name,
            unit: p.unit,
            onHand,
            historicalDailyRate: Number(historicalDailyRate.toFixed(2)),
            plannedDailyDemand: Number(plannedDailyDemand.toFixed(2)),
            effectiveDailyDemand: Number(effective.toFixed(2)),
            daysUntilStockout: isFinite(daysUntil) ? Number(daysUntil.toFixed(1)) : 999,
            leadTimeDays,
            urgency,
            vendorName: p.vendorRef?.name ?? p.vendor ?? null,
            vendorRefId: p.vendorRefId,
        });
    }

    // Sort: most urgent first (smallest daysUntil)
    rows.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
    return rows;
}
