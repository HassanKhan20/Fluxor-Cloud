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

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        // 1. Total Revenue
        const sales = await prisma.sale.findMany({
            where: { storeId },
            select: { totalAmount: true }
        });
        const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);

        // 2. Sales Count
        const salesCount = sales.length;

        // 3. Low Stock Items (Simple rule: < 10 items)
        const lowStockCount = await prisma.inventorySnapshot.count({
            where: {
                storeId,
                quantityOnHand: { lt: 10 }
            }
        });

        // 4. Recent Sales for Chart (Last 7 days)
        // Group by Date. Since SQLite doesn't have great date truncation, filtering in JS for MVP.
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
        recentSales.forEach(s => {
            const day = new Date(s.dateTime).toLocaleDateString();
            dailySales[day] = (dailySales[day] || 0) + s.totalAmount;
        });

        const chartData = Object.entries(dailySales).map(([date, amount]) => ({ date, amount }));

        res.json({
            totalRevenue,
            salesCount,
            lowStockCount,
            chartData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};
