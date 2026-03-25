import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';

// Get all alerts for the store (unread first)
export const getAlerts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const alerts = await prisma.alert.findMany({
            where: { storeId },
            orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
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

        const count = await prisma.alert.count({ where: { storeId, isRead: false } });
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
        await prisma.alert.updateMany({ where: { id, storeId }, data: { isRead: true } });
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

        await prisma.alert.updateMany({ where: { storeId, isRead: false }, data: { isRead: true } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all alerts as read:', error);
        res.status(500).json({ error: 'Failed to mark alerts as read' });
    }
};

// Helper: create an alert only if not already created in last 24 hours
async function createAlertIfNew(alert: {
    storeId: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    action: string;
    productId?: string;
    vendorName?: string;
}): Promise<boolean> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.alert.findFirst({
        where: {
            storeId: alert.storeId,
            type: alert.type,
            productId: alert.productId || null,
            vendorName: alert.vendorName || null,
            createdAt: { gte: since24h }
        }
    });
    if (existing) return false;
    await prisma.alert.create({ data: alert });
    return true;
}

// Generate alerts based on current data (called periodically or on demand)
export const generateAlerts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const created = await generateAlertsForStore(storeId);
        res.json({ generated: created, message: 'Alerts generated successfully' });
    } catch (error) {
        console.error('Error generating alerts:', error);
        res.status(500).json({ error: 'Failed to generate alerts' });
    }
};

/**
 * Core alert generation logic — callable internally (e.g. from index.ts on startup)
 */
export async function generateAlertsForStore(storeId: string): Promise<number> {
    let created = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // --- PRODUCT-LEVEL ALERTS ---
    const products = await prisma.product.findMany({
        where: { storeId, isActive: true },
        include: {
            inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
            saleItems: {
                include: { sale: { select: { dateTime: true } } },
                where: { sale: { dateTime: { gte: thirtyDaysAgo } } }
            }
        }
    });

    for (const product of products) {
        const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
        const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
        const dailySalesRate = totalSold / 30;
        const daysOfStock = dailySalesRate > 0 ? currentStock / dailySalesRate : 999;

        // LOW STOCK: Fast seller running out soon
        if (dailySalesRate > 0.5 && daysOfStock < 3 && currentStock > 0) {
            if (await createAlertIfNew({
                storeId,
                type: 'low_stock',
                priority: 'critical',
                title: `Low Stock: ${product.name}`,
                message: `Only ${currentStock} units left. At current sales rate, you'll run out in ${Math.round(daysOfStock)} day(s).`,
                action: `Reorder ${product.name} immediately to avoid a stockout.`,
                productId: product.id
            })) created++;
        }

        // OVERSTOCK: Slow mover with excessive inventory
        if (dailySalesRate < 0.1 && daysOfStock > 60 && currentStock > 5) {
            if (await createAlertIfNew({
                storeId,
                type: 'overstock',
                priority: 'warning',
                title: `Overstock: ${product.name}`,
                message: `${currentStock} units — ${Math.round(daysOfStock)} days of stock. Capital is tied up.`,
                action: `Consider running a promotion or reducing future orders for ${product.name}.`,
                productId: product.id
            })) created++;
        }

        // PRICING RISK: Low margin on a fast-moving item
        const margin = product.sellingPrice > 0
            ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100
            : 0;
        if (margin < 10 && dailySalesRate > 1) {
            if (await createAlertIfNew({
                storeId,
                type: 'pricing_risk',
                priority: 'critical',
                title: `Pricing Risk: ${product.name}`,
                message: `Only ${margin.toFixed(1)}% margin on a fast-selling item. You're barely breaking even.`,
                action: `Review pricing for ${product.name}. Consider a price increase or renegotiating with supplier.`,
                productId: product.id
            })) created++;
        }
    }

    // --- VENDOR DROP ALERTS ---
    // Compare vendor revenue this week vs last week, flag drops > 30%
    const vendorRevenueThis = new Map<string, number>();
    const vendorRevenuePrior = new Map<string, number>();

    const allSaleItems = await prisma.saleItem.findMany({
        where: { sale: { storeId, dateTime: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
        include: {
            product: { select: { vendor: true } },
            sale: { select: { dateTime: true } }
        }
    });

    for (const item of allSaleItems) {
        const vendor = item.product.vendor;
        if (!vendor) continue;
        const revenue = item.quantity * item.unitPrice;
        if (new Date(item.sale.dateTime) >= sevenDaysAgo) {
            vendorRevenueThis.set(vendor, (vendorRevenueThis.get(vendor) || 0) + revenue);
        } else {
            vendorRevenuePrior.set(vendor, (vendorRevenuePrior.get(vendor) || 0) + revenue);
        }
    }

    for (const [vendor, priorRevenue] of vendorRevenuePrior) {
        if (priorRevenue < 10) continue; // Skip tiny vendors
        const thisRevenue = vendorRevenueThis.get(vendor) || 0;
        const dropPercent = ((priorRevenue - thisRevenue) / priorRevenue) * 100;

        if (dropPercent > 30) {
            if (await createAlertIfNew({
                storeId,
                type: 'vendor_drop',
                priority: dropPercent > 60 ? 'critical' : 'warning',
                title: `Sales Drop: ${vendor} Products`,
                message: `Revenue from ${vendor} products dropped ${Math.round(dropPercent)}% this week (from $${priorRevenue.toFixed(0)} to $${thisRevenue.toFixed(0)}).`,
                action: `Review ${vendor} products — check stock levels, pricing, and placement.`,
                vendorName: vendor
            })) created++;
        }
    }

    // --- SALES DECLINE ALERT ---
    // Store-wide week-over-week decline > 20%
    const thisWeekSales = await prisma.sale.aggregate({
        where: { storeId, dateTime: { gte: sevenDaysAgo } },
        _sum: { totalAmount: true }
    });
    const lastWeekSales = await prisma.sale.aggregate({
        where: {
            storeId,
            dateTime: {
                gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                lt: sevenDaysAgo
            }
        },
        _sum: { totalAmount: true }
    });

    const thisWeekRevenue = thisWeekSales._sum.totalAmount || 0;
    const lastWeekRevenue = lastWeekSales._sum.totalAmount || 0;

    if (lastWeekRevenue > 50 && thisWeekRevenue < lastWeekRevenue * 0.8) {
        const dropPct = Math.round(((lastWeekRevenue - thisWeekRevenue) / lastWeekRevenue) * 100);
        if (await createAlertIfNew({
            storeId,
            type: 'sales_decline',
            priority: dropPct > 40 ? 'critical' : 'warning',
            title: 'Store-Wide Sales Decline',
            message: `Overall revenue is down ${dropPct}% this week ($${thisWeekRevenue.toFixed(0)} vs $${lastWeekRevenue.toFixed(0)} last week).`,
            action: 'Review your top products, check for stockouts, and consider running a promotion.'
        })) created++;
    }

    return created;
}
