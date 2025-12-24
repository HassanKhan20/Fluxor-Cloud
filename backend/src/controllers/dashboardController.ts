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
