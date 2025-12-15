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

        const now = new Date();
        const today = getDayBounds(now);

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayBounds = getDayBounds(yesterday);

        // 1. Today's Revenue
        const todaySales = await prisma.sale.findMany({
            where: { storeId, dateTime: { gte: today.start, lte: today.end } },
            select: { totalAmount: true }
        });
        const todayRevenue = todaySales.reduce((acc, sale) => acc + sale.totalAmount, 0);
        const todaySalesCount = todaySales.length;

        // 2. Yesterday's Revenue (for comparison)
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

        // 7. Recent Sales for Chart (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSales = await prisma.sale.findMany({
            where: {
                storeId,
                dateTime: { gte: sevenDaysAgo }
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
