import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to get storeId (same pattern as dashboardController)
const getStoreId = async (req: Request): Promise<string | null> => {
    // @ts-ignore
    const userId = req.user?.userId;
    if (!userId) return null;
    const membership = await prisma.storeMembership.findFirst({ where: { userId } });
    return membership?.storeId || null;
};

// Get all alerts for the store (unread first)
export const getAlerts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const alerts = await prisma.alert.findMany({
            where: { storeId },
            orderBy: [
                { isRead: 'asc' },
                { createdAt: 'desc' }
            ],
            take: 50
        });

        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};

// Get unread alert count
export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const count = await prisma.alert.count({
            where: { storeId, isRead: false }
        });

        res.json({ count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
};

// Mark alert as read
export const markAsRead = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;

        await prisma.alert.updateMany({
            where: { id, storeId },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking alert as read:', error);
        res.status(500).json({ error: 'Failed to mark alert as read' });
    }
};

// Mark all alerts as read
export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        await prisma.alert.updateMany({
            where: { storeId, isRead: false },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all alerts as read:', error);
        res.status(500).json({ error: 'Failed to mark alerts as read' });
    }
};

// Generate alerts based on current data (called periodically or on demand)
export const generateAlerts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const newAlerts: any[] = [];

        // Get products with sales data
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
                                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                            }
                        }
                    }
                }
            }
        });

        for (const product of products) {
            const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
            const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
            const dailySalesRate = totalSold / 30;
            const daysOfStock = dailySalesRate > 0 ? currentStock / dailySalesRate : 999;

            // 🔴 LOW STOCK ALERT: Fast seller with < 3 days inventory
            if (dailySalesRate > 0.5 && daysOfStock < 3 && currentStock > 0) {
                newAlerts.push({
                    storeId,
                    type: 'low_stock',
                    priority: 'critical',
                    title: `Low Stock: ${product.name}`,
                    message: `Only ${currentStock} units left. At current sales rate, you'll run out in ${Math.round(daysOfStock)} days.`,
                    action: `Reorder ${product.name} immediately to avoid stockout.`,
                    productId: product.id
                });
            }

            // 🟡 OVERSTOCK ALERT: Slow mover with > 60 days inventory
            if (dailySalesRate < 0.1 && daysOfStock > 60 && currentStock > 5) {
                newAlerts.push({
                    storeId,
                    type: 'overstock',
                    priority: 'warning',
                    title: `Overstock: ${product.name}`,
                    message: `${currentStock} units with ${Math.round(daysOfStock)} days of stock. This is tying up capital.`,
                    action: `Consider running a promotion or reducing future orders for ${product.name}.`,
                    productId: product.id
                });
            }

            // 🔴 PRICING RISK: Low margin on high-volume item
            const margin = product.sellingPrice > 0
                ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100
                : 0;
            if (margin < 10 && dailySalesRate > 1) {
                newAlerts.push({
                    storeId,
                    type: 'pricing_risk',
                    priority: 'critical',
                    title: `Pricing Risk: ${product.name}`,
                    message: `Only ${margin.toFixed(1)}% margin on a fast-selling item. You're barely breaking even.`,
                    action: `Review pricing for ${product.name}. Consider price increase or renegotiating with supplier.`,
                    productId: product.id
                });
            }
        }

        // Check for vendor drops and sales declines (compare week over week)
        // TODO: Add vendor comparison logic here

        // Only create alerts that don't already exist (avoid duplicates)
        let created = 0;
        for (const alert of newAlerts) {
            const existing = await prisma.alert.findFirst({
                where: {
                    storeId,
                    type: alert.type,
                    productId: alert.productId,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
                    }
                }
            });

            if (!existing) {
                await prisma.alert.create({ data: alert });
                created++;
            }
        }

        res.json({ generated: created, message: 'Alerts generated successfully' });
    } catch (error) {
        console.error('Error generating alerts:', error);
        res.status(500).json({ error: 'Failed to generate alerts' });
    }
};
