import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Helper (reused)
const getStoreId = async (req: Request): Promise<string | null> => {
    // @ts-ignore
    const userId = req.user?.userId;
    if (!userId) return null;
    const membership = await prisma.storeMembership.findFirst({ where: { userId } });
    return membership?.storeId || null;
};

// Helper to get start/end of a day
const getDayBounds = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// Helper to get week bounds
const getWeekBounds = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        // FIXED: Use data-based dates instead of system clock
        // Find the most recent sale date in the database to define "today"
        const mostRecentSale = await prisma.sale.findFirst({
            where: { storeId },
            orderBy: { dateTime: 'desc' },
            select: { dateTime: true }
        });

        // If no sales exist, return empty stats
        if (!mostRecentSale) {
            return res.json({
                totalRevenue: 0,
                salesCount: 0,
                lowStockCount: 0,
                chartData: [],
                revenueChange: null,
                salesCountChange: null,
                yesterdayRevenue: 0,
                hasInventorySetupNeeded: true,
                unmatchedCount: 0,
                avgTransaction: 0,
                productsWithoutStock: 0
            });
        }

        // Define "today" as the most recent date in sales data
        const dataToday = new Date(mostRecentSale.dateTime);
        const today = getDayBounds(dataToday);

        // Define "yesterday" as one day before the most recent sale date
        const dataYesterday = new Date(dataToday);
        dataYesterday.setDate(dataYesterday.getDate() - 1);
        const yesterdayBounds = getDayBounds(dataYesterday);

        // 1. Today's Revenue (based on data's "today")
        const todaySales = await prisma.sale.findMany({
            where: { storeId, dateTime: { gte: today.start, lte: today.end } },
            select: { totalAmount: true }
        });
        const todayRevenue = todaySales.reduce((acc, sale) => acc + sale.totalAmount, 0);
        const todaySalesCount = todaySales.length;

        // 2. Yesterday's Revenue (for comparison - based on data's "yesterday")
        const yesterdaySales = await prisma.sale.findMany({
            where: { storeId, dateTime: { gte: yesterdayBounds.start, lte: yesterdayBounds.end } },
            select: { totalAmount: true }
        });
        const yesterdayRevenue = yesterdaySales.reduce((acc, sale) => acc + sale.totalAmount, 0);
        const yesterdaySalesCount = yesterdaySales.length;

        // 3. Calculate real comparisons (null if no comparison data)
        let revenueChange: number | null = null;
        let salesCountChange: number | null = null;

        if (yesterdayRevenue > 0) {
            revenueChange = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
        }
        if (yesterdaySalesCount > 0) {
            salesCountChange = ((todaySalesCount - yesterdaySalesCount) / yesterdaySalesCount) * 100;
        }

        // 4. Low Stock Items (products with initialStock set and stock < 10)
        const lowStockProducts = await prisma.product.findMany({
            where: {
                storeId,
                initialStock: { not: null },
                inventorySnapshots: { some: { quantityOnHand: { lt: 10 } } }
            },
            include: { inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 } }
        });
        const lowStockCount = lowStockProducts.filter(p =>
            p.inventorySnapshots[0]?.quantityOnHand < 10
        ).length;

        // 5. Products needing inventory setup
        const productsWithoutStock = await prisma.product.count({
            where: { storeId, initialStock: null }
        });
        const hasInventorySetupNeeded = productsWithoutStock > 0;

        // 6. Unmatched products count
        const unmatchedCount = await prisma.product.count({
            where: { storeId, isUnmatched: true }
        });

        // 7. Recent Sales for Chart (Last 7 days relative to data's "today")
        const sevenDaysAgo = new Date(dataToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSales = await prisma.sale.findMany({
            where: {
                storeId,
                dateTime: { gte: sevenDaysAgo, lte: today.end }
            },
            select: { dateTime: true, totalAmount: true }
        });

        // Group by Day
        const dailySales: Record<string, number> = {};
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        recentSales.forEach(s => {
            const date = new Date(s.dateTime);
            const dayName = dayNames[date.getDay()];
            dailySales[dayName] = (dailySales[dayName] || 0) + s.totalAmount;
        });

        const chartData = Object.entries(dailySales).map(([date, amount]) => ({ date, amount }));

        // 8. Average transaction amount
        const avgTransaction = todaySalesCount > 0 ? todayRevenue / todaySalesCount : 0;

        res.json({
            totalRevenue: todayRevenue,
            salesCount: todaySalesCount,
            lowStockCount,
            chartData,
            // New fields for accurate comparisons
            revenueChange,
            salesCountChange,
            yesterdayRevenue,
            hasInventorySetupNeeded,
            unmatchedCount,
            avgTransaction,
            productsWithoutStock
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

// NEW: Weekly Summary for Owner Dashboard
export const getWeeklySummary = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        // Get current week bounds
        const now = new Date();
        const thisWeek = getWeekBounds(now);
        const lastWeekDate = new Date(now);
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const lastWeek = getWeekBounds(lastWeekDate);

        // This week's revenue
        const thisWeekSales = await prisma.sale.aggregate({
            where: { storeId, dateTime: { gte: thisWeek.start, lte: thisWeek.end } },
            _sum: { totalAmount: true }
        });
        const thisWeekRevenue = thisWeekSales._sum.totalAmount || 0;

        // Last week's revenue
        const lastWeekSales = await prisma.sale.aggregate({
            where: { storeId, dateTime: { gte: lastWeek.start, lte: lastWeek.end } },
            _sum: { totalAmount: true }
        });
        const lastWeekRevenue = lastWeekSales._sum.totalAmount || 0;

        const revenueChange = thisWeekRevenue - lastWeekRevenue;
        const revenueChangePercent = lastWeekRevenue > 0
            ? ((revenueChange / lastWeekRevenue) * 100)
            : 0;

        // Get money wasted breakdown
        const wastedData = await calculateMoneyWasted(storeId);

        // Top selling product this week
        const topProduct = await prisma.saleItem.groupBy({
            by: ['productId'],
            where: {
                sale: { storeId, dateTime: { gte: thisWeek.start, lte: thisWeek.end } }
            },
            _sum: { lineTotal: true },
            orderBy: { _sum: { lineTotal: 'desc' } },
            take: 1
        });

        let topProductData = null;
        if (topProduct.length > 0) {
            const product = await prisma.product.findUnique({
                where: { id: topProduct[0].productId }
            });
            if (product) {
                topProductData = {
                    id: product.id,
                    name: product.name,
                    revenue: topProduct[0]._sum.lineTotal || 0
                };
            }
        }

        // Worst performer (lowest margin product with sales)
        const productsWithSales = await prisma.product.findMany({
            where: { storeId, isActive: true },
            include: {
                saleItems: {
                    where: {
                        sale: { dateTime: { gte: thisWeek.start, lte: thisWeek.end } }
                    }
                }
            }
        });

        let worstPerformer = null;
        let worstMargin = 100;

        for (const product of productsWithSales) {
            if (product.saleItems.length === 0) continue;
            const margin = product.sellingPrice > 0
                ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100
                : 0;
            if (margin < worstMargin) {
                worstMargin = margin;
                worstPerformer = {
                    id: product.id,
                    name: product.name,
                    type: 'product' as const,
                    reason: `Only ${margin.toFixed(1)}% margin`
                };
            }
        }

        // Generate recommendations
        const recommendations: string[] = [];

        if (revenueChange < 0) {
            recommendations.push(`Revenue is down ${Math.abs(revenueChangePercent).toFixed(0)}% from last week. Review slow-moving items.`);
        } else if (revenueChange > 0) {
            recommendations.push(`Great week! Revenue up ${revenueChangePercent.toFixed(0)}% from last week.`);
        }

        if (wastedData.total > 100) {
            recommendations.push(`$${wastedData.total.toFixed(0)} in money wasted. ${wastedData.topCauses[0]?.action || 'Review your inventory.'}`);
        }

        if (worstPerformer && worstMargin < 15) {
            recommendations.push(`Consider raising price on ${worstPerformer.name} — margin is only ${worstMargin.toFixed(0)}%.`);
        }

        res.json({
            weekStart: thisWeek.start.toISOString(),
            weekEnd: thisWeek.end.toISOString(),
            revenue: {
                amount: Math.round(thisWeekRevenue * 100) / 100,
                change: Math.round(revenueChange * 100) / 100,
                changePercent: Math.round(revenueChangePercent * 10) / 10
            },
            moneyWasted: {
                total: wastedData.total,
                primaryReason: wastedData.topCauses[0]?.description || 'No significant waste detected'
            },
            topProduct: topProductData,
            worstPerformer,
            recommendations
        });

    } catch (error) {
        console.error('Error generating weekly summary:', error);
        res.status(500).json({ message: 'Error generating weekly summary' });
    }
};

// Helper function to calculate money wasted
async function calculateMoneyWasted(storeId: string) {
    const products = await prisma.product.findMany({
        where: { storeId, isActive: true },
        include: {
            inventorySnapshots: {
                orderBy: { snapshotDate: 'desc' },
                take: 1
            },
            saleItems: {
                where: {
                    sale: {
                        dateTime: {
                            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                        }
                    }
                }
            }
        }
    });

    let deadStock = { amount: 0, productCount: 0, products: [] as string[] };
    let overstock = { amount: 0, productCount: 0, products: [] as string[] };
    let slowMovers = { amount: 0, productCount: 0, products: [] as string[] };
    let shrinkLoss = { amount: 0, productCount: 0, products: [] as string[] };

    for (const product of products) {
        const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
        const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
        const dailySalesRate = totalSold / 90;
        const daysOfStock = dailySalesRate > 0 ? currentStock / dailySalesRate : 999;

        // Dead stock: No sales in 90 days with inventory
        if (totalSold === 0 && currentStock > 0) {
            const wasteAmount = currentStock * product.costPrice;
            deadStock.amount += wasteAmount;
            deadStock.productCount++;
            deadStock.products.push(product.name);
        }
        // Overstock: >60 days of inventory
        else if (daysOfStock > 60 && currentStock > 5) {
            const optimalStock = Math.ceil(dailySalesRate * 30); // 30 days of inventory
            const excessUnits = Math.max(0, currentStock - optimalStock);
            const wasteAmount = excessUnits * product.costPrice * 0.3; // 30% opportunity cost
            overstock.amount += wasteAmount;
            overstock.productCount++;
            overstock.products.push(product.name);
        }
        // Slow movers: Very low sales velocity
        else if (dailySalesRate < 0.1 && dailySalesRate > 0 && currentStock > 3) {
            const wasteAmount = currentStock * product.costPrice * 0.1; // 10% opportunity cost
            slowMovers.amount += wasteAmount;
            slowMovers.productCount++;
            slowMovers.products.push(product.name);
        }
    }

    const total = deadStock.amount + overstock.amount + slowMovers.amount + shrinkLoss.amount;

    // Build top causes
    const causes: Array<{ description: string; amount: number; action: string; productIds?: string[] }> = [];

    if (deadStock.amount > 0) {
        causes.push({
            description: `${deadStock.productCount} products with no sales in 90 days`,
            amount: Math.round(deadStock.amount * 100) / 100,
            action: `Consider clearance sale or returning to supplier: ${deadStock.products.slice(0, 3).join(', ')}`,
            productIds: deadStock.products
        });
    }

    if (overstock.amount > 0) {
        causes.push({
            description: `${overstock.productCount} products with excess inventory`,
            amount: Math.round(overstock.amount * 100) / 100,
            action: `Reduce order quantities for: ${overstock.products.slice(0, 3).join(', ')}`,
            productIds: overstock.products
        });
    }

    if (slowMovers.amount > 0) {
        causes.push({
            description: `${slowMovers.productCount} slow-moving products`,
            amount: Math.round(slowMovers.amount * 100) / 100,
            action: `Review pricing or placement for: ${slowMovers.products.slice(0, 3).join(', ')}`,
            productIds: slowMovers.products
        });
    }

    // Sort by amount
    causes.sort((a, b) => b.amount - a.amount);

    // Generate explanation
    let explanation = 'Your inventory is healthy!';
    if (total > 0) {
        const topCause = causes[0];
        explanation = `You have $${total.toFixed(0)} tied up in underperforming inventory. The biggest issue is ${topCause.description.toLowerCase()}.`;
    }

    return {
        total: Math.round(total * 100) / 100,
        breakdown: {
            deadStock: { amount: Math.round(deadStock.amount * 100) / 100, productCount: deadStock.productCount },
            overstock: { amount: Math.round(overstock.amount * 100) / 100, productCount: overstock.productCount },
            slowMovers: { amount: Math.round(slowMovers.amount * 100) / 100, productCount: slowMovers.productCount },
            shrinkLoss: { amount: Math.round(shrinkLoss.amount * 100) / 100, productCount: shrinkLoss.productCount }
        },
        topCauses: causes.slice(0, 3),
        explanation
    };
}

// NEW: Money Wasted Breakdown endpoint
export const getMoneyWastedBreakdown = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const breakdown = await calculateMoneyWasted(storeId);
        res.json(breakdown);

    } catch (error) {
        console.error('Error calculating money wasted:', error);
        res.status(500).json({ message: 'Error calculating money wasted breakdown' });
    }
};

