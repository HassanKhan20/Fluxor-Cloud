import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';

// Helper: Get Monday of a week (ISO week start)
const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper: Format date as YYYY-MM-DD
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

// Simple linear regression for predictions
const linearRegression = (data: number[]): { slope: number; intercept: number } => {
    const n = data.length;
    if (n === 0) return { slope: 0, intercept: 0 };
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (data[i] - yMean);
        denominator += (i - xMean) ** 2;
    }
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;
    return { slope, intercept };
};

/**
 * GET /analytics/trends
 * FIXED: Revenue from SUM(quantity * unitPrice), not sale.totalAmount
 * FIXED: avgDaily divides by ACTIVE sales days only
 * FIXED: Growth rate compares this week vs last week
 * FIXED: Missing days = null, not 0
 */
export const getTrends = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const period = (req.query.period as string) || 'daily';

        // FIX #1: Get revenue from SaleItems (quantity * unitPrice), not sale.totalAmount
        const saleItems = await prisma.saleItem.findMany({
            where: { sale: { storeId } },
            include: { sale: { select: { dateTime: true } } }
        });

        if (saleItems.length === 0) {
            return res.json({
                trends: [],
                summary: { totalRevenue: 0, avgDaily: 0, growthRate: null }
            });
        }

        // Group by period using sale.dateTime (FIX #3: use sale date, not import time)
        const grouped: Record<string, number> = {};

        saleItems.forEach(item => {
            const date = new Date(item.sale.dateTime);
            let key: string;

            if (period === 'weekly') {
                const monday = getMonday(date);
                key = `Week of ${formatDate(monday)}`;
            } else if (period === 'monthly') {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            } else {
                key = formatDate(date);
            }

            // FIX #1: Canonical revenue = quantity * unitPrice
            const revenue = item.quantity * item.unitPrice;
            grouped[key] = (grouped[key] || 0) + revenue;
        });

        // FIX #4: Build array with nulls for missing days (daily view only)
        let trends: Array<{ period: string; amount: number | null }> = [];

        if (period === 'daily') {
            const sortedDates = Object.keys(grouped).sort();
            if (sortedDates.length > 0) {
                const startDate = new Date(sortedDates[0]);
                const endDate = new Date(sortedDates[sortedDates.length - 1]);

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const key = formatDate(d);
                    trends.push({
                        period: key,
                        amount: grouped[key] !== undefined ? Math.round(grouped[key] * 100) / 100 : null
                    });
                }
            }
        } else {
            trends = Object.entries(grouped)
                .map(([period, amount]) => ({ period, amount: Math.round(amount * 100) / 100 }));
        }

        // Limit to last 30 data points
        trends = trends.slice(-30);

        // FIX #5: Total Revenue from raw data (single source of truth)
        const totalRevenue = saleItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        // FIX #6: Avg Daily = total / ACTIVE sales days (not calendar days)
        const activeDays = new Set(saleItems.map(item => formatDate(new Date(item.sale.dateTime)))).size;
        const avgDaily = activeDays > 0 ? totalRevenue / activeDays : 0;

        // FIX #7: Growth rate = this week vs last week
        const now = new Date();
        const thisMonday = getMonday(now);
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);
        const twoMondaysAgo = new Date(lastMonday);
        twoMondaysAgo.setDate(twoMondaysAgo.getDate() - 7);

        const thisWeekRevenue = saleItems
            .filter(item => new Date(item.sale.dateTime) >= thisMonday)
            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        const lastWeekRevenue = saleItems
            .filter(item => {
                const d = new Date(item.sale.dateTime);
                return d >= lastMonday && d < thisMonday;
            })
            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        const growthRate = lastWeekRevenue > 0
            ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
            : null;

        res.json({
            trends,
            summary: {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                avgDaily: Math.round(avgDaily * 100) / 100,
                growthRate: growthRate !== null ? Math.round(growthRate * 10) / 10 : null,
                thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
                lastWeekRevenue: Math.round(lastWeekRevenue * 100) / 100,
                activeDays
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching trends' });
    }
};

/**
 * GET /analytics/predictions
 * FIX #8: Forecasts use separate logic, never affect historical metrics
 * FIX #11: Learning mode - skip products with importCount < 2
 */
export const getPredictions = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // FIX #11: Only include products with importCount >= 2 (learning mode)
        const saleItems = await prisma.saleItem.findMany({
            where: {
                sale: { storeId, dateTime: { gte: thirtyDaysAgo } },
                product: { importCount: { gte: 2 } }  // Learning mode filter
            },
            include: { sale: { select: { dateTime: true } } }
        });

        // Group by day
        const dailySales: Record<string, number> = {};
        saleItems.forEach(item => {
            const key = formatDate(new Date(item.sale.dateTime));
            dailySales[key] = (dailySales[key] || 0) + (item.quantity * item.unitPrice);
        });

        const values = Object.values(dailySales);

        if (values.length < 7) {
            return res.json({
                predictions: [],
                confidence: 'low',
                message: 'Not enough historical data (need 7+ days of sales)',
                learningMode: true
            });
        }

        const { slope, intercept } = linearRegression(values);
        const predictions: { date: string; predicted: number; confidence: string }[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);
            const predicted = Math.max(0, intercept + slope * (values.length + i - 1));
            predictions.push({
                date: `${dayNames[futureDate.getDay()]} ${futureDate.getMonth() + 1}/${futureDate.getDate()}`,
                predicted: Math.round(predicted * 100) / 100,
                confidence: values.length >= 20 ? 'high' : 'medium'
            });
        }

        const predictedWeekTotal = predictions.reduce((a, b) => a + b.predicted, 0);
        const lastWeekTotal = values.slice(-7).reduce((a, b) => a + b, 0);
        const weekGrowth = lastWeekTotal > 0 ? ((predictedWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : null;

        res.json({
            predictions,
            summary: {
                predictedWeekTotal: Math.round(predictedWeekTotal * 100) / 100,
                lastWeekTotal: Math.round(lastWeekTotal * 100) / 100,
                expectedGrowth: weekGrowth !== null ? Math.round(weekGrowth * 10) / 10 : null
            },
            confidence: values.length >= 20 ? 'high' : values.length >= 10 ? 'medium' : 'low',
            learningMode: false
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating predictions' });
    }
};

/**
 * GET /analytics/top-products
 * FIX #9: Percentage uses totalRevenue as denominator (not 100% always)
 * FIX #5: Revenue = SUM(quantity * unitPrice)
 * FIX #11: Learning mode filter
 */
export const getTopProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const saleItems = await prisma.saleItem.findMany({
            where: { sale: { storeId, dateTime: { gte: thirtyDaysAgo } } },
            include: {
                product: { select: { id: true, name: true, category: true, importCount: true } },
                sale: { select: { dateTime: true } }
            }
        });

        // Aggregate by product using quantity * unitPrice (FIX #5)
        const productStats: Record<string, {
            name: string;
            category: string | null;
            importCount: number;
            totalRevenue: number;
            totalQuantity: number;
            recentRevenue: number;
            olderRevenue: number;
        }> = {};

        saleItems.forEach(item => {
            const id = item.product.id;
            const revenue = item.quantity * item.unitPrice; // Canonical formula

            if (!productStats[id]) {
                productStats[id] = {
                    name: item.product.name,
                    category: item.product.category,
                    importCount: item.product.importCount,
                    totalRevenue: 0,
                    totalQuantity: 0,
                    recentRevenue: 0,
                    olderRevenue: 0
                };
            }

            productStats[id].totalRevenue += revenue;
            productStats[id].totalQuantity += item.quantity;

            if (new Date(item.sale.dateTime) >= fifteenDaysAgo) {
                productStats[id].recentRevenue += revenue;
            } else {
                productStats[id].olderRevenue += revenue;
            }
        });

        // FIX #9: Calculate percentage of total revenue (not always 100%)
        const grandTotalRevenue = Object.values(productStats).reduce((sum, p) => sum + p.totalRevenue, 0);

        const products = Object.entries(productStats)
            .map(([id, stats]) => {
                const trend = stats.olderRevenue > 0
                    ? ((stats.recentRevenue - stats.olderRevenue) / stats.olderRevenue) * 100
                    : stats.recentRevenue > 0 ? 100 : 0;

                // FIX #9: Percentage = product revenue / grand total * 100
                const percentOfTotal = grandTotalRevenue > 0
                    ? (stats.totalRevenue / grandTotalRevenue) * 100
                    : 0;

                return {
                    id,
                    name: stats.name,
                    category: stats.category,
                    totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
                    totalQuantity: stats.totalQuantity,
                    percentOfTotal: Math.round(percentOfTotal * 10) / 10,
                    trend: Math.round(trend * 10) / 10,
                    trendDirection: trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable',
                    learningMode: stats.importCount < 2
                };
            })
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        const topPerformers = products.slice(0, 5);
        const trending = [...products].sort((a, b) => b.trend - a.trend).slice(0, 5);
        const declining = [...products].sort((a, b) => a.trend - b.trend).slice(0, 5);

        res.json({
            topPerformers,
            trending,
            declining,
            totalProducts: products.length,
            grandTotalRevenue: Math.round(grandTotalRevenue * 100) / 100
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching product analytics' });
    }
};

/**
 * GET /analytics/insights
 * FIX #10: Clear, separate insight definitions
 * FIX #11: Learning mode check
 */
export const getInsights = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // FIX #11: Only products with importCount >= 2
        const saleItems = await prisma.saleItem.findMany({
            where: {
                sale: { storeId, dateTime: { gte: thirtyDaysAgo } },
                product: { importCount: { gte: 2 } }
            },
            include: {
                product: { select: { id: true, name: true } },
                sale: { select: { dateTime: true } }
            }
        });

        const insights: { type: string; title: string; description: string; icon: string; metric?: string }[] = [];

        // Check if still in learning mode
        const totalProducts = await prisma.product.count({ where: { storeId } });
        const learnedProducts = await prisma.product.count({ where: { storeId, importCount: { gte: 2 } } });

        if (learnedProducts < totalProducts * 0.5) {
            insights.push({
                type: 'info',
                title: 'Learning Mode',
                description: `Fluxor is learning your sales patterns. ${learnedProducts}/${totalProducts} products have enough data.`,
                icon: '🎓',
                metric: 'learning'
            });
        }

        if (saleItems.length === 0) {
            if (insights.length === 0) {
                insights.push({ type: 'info', title: 'No Data', description: 'Import sales data to see insights', icon: '📊' });
            }
            return res.json({ insights });
        }

        // FIX #10: Separate insight types with clear definitions

        // 1. BEST SELLER - Highest revenue in last 7 days
        const recentByProduct: Record<string, { name: string; revenue: number }> = {};
        saleItems.filter(item => new Date(item.sale.dateTime) >= sevenDaysAgo).forEach(item => {
            const id = item.product.id;
            if (!recentByProduct[id]) recentByProduct[id] = { name: item.product.name, revenue: 0 };
            recentByProduct[id].revenue += item.quantity * item.unitPrice;
        });

        const sortedByRevenue = Object.values(recentByProduct).sort((a, b) => b.revenue - a.revenue);
        if (sortedByRevenue.length > 0) {
            insights.push({
                type: 'success',
                title: 'Best Seller (Last 7 Days)',
                description: `${sortedByRevenue[0].name} - $${Math.round(sortedByRevenue[0].revenue)} revenue`,
                icon: '🏆',
                metric: 'best_seller'
            });
        }

        // 2. LOWEST PERFORMING - Lowest revenue in last 7 days (that had sales)
        if (sortedByRevenue.length > 1) {
            const lowest = sortedByRevenue[sortedByRevenue.length - 1];
            insights.push({
                type: 'warning',
                title: 'Lowest Performing (Last 7 Days)',
                description: `${lowest.name} - only $${Math.round(lowest.revenue)} revenue`,
                icon: '📉',
                metric: 'lowest_performing'
            });
        }

        // 3. FASTEST DECLINING - Largest % drop vs prior window
        const priorByProduct: Record<string, { name: string; revenue: number }> = {};
        saleItems.filter(item => {
            const d = new Date(item.sale.dateTime);
            return d >= fourteenDaysAgo && d < sevenDaysAgo;
        }).forEach(item => {
            const id = item.product.id;
            if (!priorByProduct[id]) priorByProduct[id] = { name: item.product.name, revenue: 0 };
            priorByProduct[id].revenue += item.quantity * item.unitPrice;
        });

        const declineRates: Array<{ name: string; decline: number }> = [];
        for (const [id, recent] of Object.entries(recentByProduct)) {
            const prior = priorByProduct[id];
            if (prior && prior.revenue > 0) {
                const decline = ((recent.revenue - prior.revenue) / prior.revenue) * 100;
                if (decline < -10) {
                    declineRates.push({ name: recent.name, decline });
                }
            }
        }
        declineRates.sort((a, b) => a.decline - b.decline);

        if (declineRates.length > 0) {
            insights.push({
                type: 'warning',
                title: 'Fastest Declining',
                description: `${declineRates[0].name} is down ${Math.round(Math.abs(declineRates[0].decline))}% vs prior week`,
                icon: '⚠️',
                metric: 'fastest_declining'
            });
        }

        // 4. Week-over-week insight
        const thisWeekRevenue = saleItems
            .filter(item => new Date(item.sale.dateTime) >= sevenDaysAgo)
            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        const lastWeekRevenue = saleItems
            .filter(item => {
                const d = new Date(item.sale.dateTime);
                return d >= fourteenDaysAgo && d < sevenDaysAgo;
            })
            .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        if (lastWeekRevenue > 0) {
            const weekChange = ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
            if (weekChange > 10) {
                insights.push({
                    type: 'success',
                    title: 'Strong Week',
                    description: `Sales are up ${Math.round(weekChange)}% compared to last week`,
                    icon: '🚀',
                    metric: 'growth'
                });
            } else if (weekChange < -10) {
                insights.push({
                    type: 'warning',
                    title: 'Sales Dip',
                    description: `Sales are down ${Math.round(Math.abs(weekChange))}% from last week`,
                    icon: '📉',
                    metric: 'decline'
                });
            }
        }

        // 5. Daily average insight
        const activeDays = new Set(saleItems.map(item => formatDate(new Date(item.sale.dateTime)))).size;
        const totalRevenue = saleItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const avgDaily = activeDays > 0 ? totalRevenue / activeDays : 0;

        insights.push({
            type: 'info',
            title: 'Average Daily Revenue',
            description: `$${Math.round(avgDaily)} per active sales day (${activeDays} days)`,
            icon: '💰',
            metric: 'avg_daily'
        });

        res.json({ insights });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating insights' });
    }
};

/**
 * GET /analytics/inventory-health
 * Returns: slow movers, restock alerts, dead stock
 * For retail store operational decision support
 */
export const getInventoryHealth = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all products with their inventory and sales
        const products = await prisma.product.findMany({
            where: { storeId, isActive: true },
            include: {
                inventorySnapshots: {
                    orderBy: { snapshotDate: 'desc' },
                    take: 1
                },
                saleItems: {
                    where: { sale: { dateTime: { gte: thirtyDaysAgo } } },
                    include: { sale: { select: { dateTime: true } } }
                }
            }
        });

        const slowMovers: Array<{
            id: string;
            name: string;
            category: string | null;
            salesLast7Days: number;
            revenueLast7Days: number;
            daysSinceLastSale: number | null;
        }> = [];

        const restockAlerts: Array<{
            id: string;
            name: string;
            currentStock: number;
            avgDailySales: number;
            daysUntilStockout: number;
            urgency: 'critical' | 'warning' | 'low';
        }> = [];

        const deadStock: Array<{
            id: string;
            name: string;
            category: string | null;
            currentStock: number;
            daysSinceLastSale: number;
        }> = [];

        for (const product of products) {
            // Skip products still in learning mode
            if (product.importCount < 2) continue;

            const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;

            // Calculate sales in last 7 days and last 30 days
            const salesLast7Days = product.saleItems
                .filter(si => new Date(si.sale.dateTime) >= sevenDaysAgo)
                .reduce((sum, si) => sum + si.quantity, 0);

            const salesLast30Days = product.saleItems.reduce((sum, si) => sum + si.quantity, 0);

            const revenueLast7Days = product.saleItems
                .filter(si => new Date(si.sale.dateTime) >= sevenDaysAgo)
                .reduce((sum, si) => sum + (si.quantity * si.unitPrice), 0);

            // Find last sale date
            const lastSaleDate = product.saleItems.length > 0
                ? new Date(Math.max(...product.saleItems.map(si => new Date(si.sale.dateTime).getTime())))
                : null;

            const daysSinceLastSale = lastSaleDate
                ? Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            // SLOW MOVERS: Low/no sales in last 7 days
            if (salesLast7Days <= 1 && salesLast30Days > 0) {
                slowMovers.push({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    salesLast7Days,
                    revenueLast7Days,
                    daysSinceLastSale
                });
            }

            // DEAD STOCK: No sales in 30+ days
            if (salesLast30Days === 0 && currentStock > 0) {
                deadStock.push({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    currentStock,
                    daysSinceLastSale: daysSinceLastSale ?? 30
                });
            }

            // RESTOCK ALERTS: Calculate days until stockout
            if (currentStock > 0 && salesLast30Days > 0) {
                const avgDailySales = salesLast30Days / 30;
                const daysUntilStockout = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;

                if (daysUntilStockout <= 7) {
                    restockAlerts.push({
                        id: product.id,
                        name: product.name,
                        currentStock,
                        avgDailySales: Math.round(avgDailySales * 10) / 10,
                        daysUntilStockout,
                        urgency: daysUntilStockout <= 2 ? 'critical' : daysUntilStockout <= 5 ? 'warning' : 'low'
                    });
                }
            }
        }

        // Sort by urgency/relevance
        slowMovers.sort((a, b) => (b.daysSinceLastSale ?? 0) - (a.daysSinceLastSale ?? 0));
        restockAlerts.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
        deadStock.sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);

        res.json({
            slowMovers: slowMovers.slice(0, 5),
            restockAlerts: restockAlerts.slice(0, 5),
            deadStock: deadStock.slice(0, 5),
            summary: {
                slowMoversCount: slowMovers.length,
                restockAlertsCount: restockAlerts.length,
                deadStockCount: deadStock.length,
                criticalAlerts: restockAlerts.filter(r => r.urgency === 'critical').length
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching inventory health' });
    }
};

/**
 * GET /analytics/money-wasted
 * THE METRIC SQUARE NEVER SHOWS
 * Returns: dead stock $, overstock $, missed sales $, net recoverable cash
 */
export const getMoneyWasted = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all products with inventory and sales
        const products = await prisma.product.findMany({
            where: { storeId, isActive: true },
            include: {
                inventorySnapshots: {
                    orderBy: { snapshotDate: 'desc' },
                    take: 1
                },
                saleItems: {
                    where: { sale: { dateTime: { gte: thirtyDaysAgo } } },
                    include: { sale: { select: { dateTime: true } } }
                }
            }
        });

        let deadStockValue = 0;
        let overstockValue = 0;
        let missedSalesValue = 0;
        const deadStockItems: Array<{ name: string; value: number; daysSinceLastSale: number }> = [];
        const overstockItems: Array<{ name: string; excessUnits: number; value: number }> = [];
        const stockoutItems: Array<{ name: string; estimatedMissedSales: number; value: number }> = [];

        for (const product of products) {
            if (product.importCount < 2) continue; // Skip learning mode

            const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
            const costPrice = product.costPrice || product.sellingPrice * 0.7;
            const sellingPrice = product.sellingPrice || 0;

            // Calculate sales velocity (avg daily sales last 30 days)
            const salesLast30Days = product.saleItems.reduce((sum, si) => sum + si.quantity, 0);
            const avgDailySales = salesLast30Days / 30;

            // Find last sale date
            const lastSaleDate = product.saleItems.length > 0
                ? new Date(Math.max(...product.saleItems.map(si => new Date(si.sale.dateTime).getTime())))
                : null;
            const daysSinceLastSale = lastSaleDate
                ? Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
                : 30;

            // 1. DEAD STOCK: No sales in 30+ days, still have inventory
            if (salesLast30Days === 0 && currentStock > 0) {
                const value = currentStock * costPrice;
                deadStockValue += value;
                deadStockItems.push({
                    name: product.name,
                    value: Math.round(value * 100) / 100,
                    daysSinceLastSale
                });
            }

            // 2. OVERSTOCK: Stock > 60 days supply (based on velocity)
            if (avgDailySales > 0 && currentStock > 0) {
                const daysOfSupply = currentStock / avgDailySales;
                if (daysOfSupply > 60) {
                    const optimalStock = Math.ceil(avgDailySales * 30); // 30 days supply is optimal
                    const excessUnits = Math.max(0, currentStock - optimalStock);
                    const value = excessUnits * costPrice;
                    if (excessUnits > 0) {
                        overstockValue += value;
                        overstockItems.push({
                            name: product.name,
                            excessUnits,
                            value: Math.round(value * 100) / 100
                        });
                    }
                }
            }

            // 3. MISSED SALES: Had stockout (0 stock), but had sales velocity before
            if (currentStock === 0 && avgDailySales > 0.1) {
                // Estimate missed sales = velocity × days at zero stock (assume ~7 days average)
                const estimatedMissedUnits = avgDailySales * 7;
                const value = estimatedMissedUnits * sellingPrice;
                missedSalesValue += value;
                stockoutItems.push({
                    name: product.name,
                    estimatedMissedSales: Math.round(estimatedMissedUnits),
                    value: Math.round(value * 100) / 100
                });
            }
        }

        // Net recoverable = dead stock + overstock (what you could liquidate or return)
        const netRecoverable = deadStockValue + overstockValue;
        const totalWasted = deadStockValue + overstockValue + missedSalesValue;

        res.json({
            summary: {
                totalWasted: Math.round(totalWasted * 100) / 100,
                deadStockValue: Math.round(deadStockValue * 100) / 100,
                overstockValue: Math.round(overstockValue * 100) / 100,
                missedSalesValue: Math.round(missedSalesValue * 100) / 100,
                netRecoverable: Math.round(netRecoverable * 100) / 100
            },
            breakdown: {
                deadStock: deadStockItems.slice(0, 5),
                overstock: overstockItems.slice(0, 5),
                stockouts: stockoutItems.slice(0, 5)
            },
            insights: generateMoneyWastedInsights(deadStockValue, overstockValue, missedSalesValue)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error calculating money wasted' });
    }
};

// Generate actionable insights for money wasted
function generateMoneyWastedInsights(deadStock: number, overstock: number, missedSales: number): string[] {
    const insights: string[] = [];

    if (deadStock > 100) {
        insights.push(`$${Math.round(deadStock)} tied up in dead stock. Consider discounting or returning to supplier.`);
    }
    if (overstock > 100) {
        insights.push(`$${Math.round(overstock)} in overstock. Reduce order quantities to free up cash.`);
    }
    if (missedSales > 50) {
        insights.push(`~$${Math.round(missedSales)} in missed sales from stockouts. Keep faster-moving items stocked.`);
    }
    if (insights.length === 0) {
        insights.push("Your inventory is well-optimized! No significant waste detected.");
    }

    return insights;
}

// ── CASH FLOW ─────────────────────────────────────────────────────────────────

export const getCashFlow = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const days = parseInt(req.query.days as string) || 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Revenue: from sales
        const sales = await prisma.sale.findMany({
            where: { storeId, dateTime: { gte: startDate } },
            include: { items: { include: { product: { select: { costPrice: true } } } } }
        });

        // Expenses: from invoices
        const invoices = await prisma.invoice.findMany({
            where: { storeId, createdAt: { gte: startDate }, totalAmount: { not: null } }
        });

        // Build daily breakdown
        const dailyMap: Record<string, { date: string; revenue: number; cogs: number; invoiceSpend: number }> = {};

        for (const sale of sales) {
            const date = formatDate(new Date(sale.dateTime));
            if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, cogs: 0, invoiceSpend: 0 };
            dailyMap[date].revenue += sale.totalAmount;
            // COGS = sum of (qty * costPrice) for each item
            for (const item of sale.items) {
                dailyMap[date].cogs += item.quantity * (item.product?.costPrice || 0);
            }
        }

        for (const invoice of invoices) {
            const date = formatDate(new Date(invoice.createdAt));
            if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, cogs: 0, invoiceSpend: 0 };
            dailyMap[date].invoiceSpend += invoice.totalAmount || 0;
        }

        const daily = Object.values(dailyMap)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({
                ...d,
                grossProfit: Math.round((d.revenue - d.cogs) * 100) / 100,
                grossMargin: d.revenue > 0 ? Math.round(((d.revenue - d.cogs) / d.revenue) * 1000) / 10 : 0
            }));

        const totalRevenue = daily.reduce((sum, d) => sum + d.revenue, 0);
        const totalCOGS = daily.reduce((sum, d) => sum + d.cogs, 0);
        const totalInvoiceSpend = daily.reduce((sum, d) => sum + d.invoiceSpend, 0);
        const totalGrossProfit = totalRevenue - totalCOGS;

        res.json({
            daily,
            summary: {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalCOGS: Math.round(totalCOGS * 100) / 100,
                totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
                grossMargin: totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 1000) / 10 : 0,
                totalInvoiceSpend: Math.round(totalInvoiceSpend * 100) / 100,
                avgDailyProfit: daily.length > 0 ? Math.round((totalGrossProfit / daily.length) * 100) / 100 : 0
            }
        });
    } catch (e) {
        console.error('Cash flow error:', e);
        res.status(500).json({ message: 'Failed to fetch cash flow' });
    }
};
