import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';

// Get all products that need reordering with calculated quantities
export const getReorderList = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const products = await prisma.product.findMany({
            where: { storeId, isActive: true },
            include: {
                inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
                saleItems: { where: { sale: { dateTime: { gte: thirtyDaysAgo } } } }
            }
        });

        const reorderItems = [];

        for (const product of products) {
            const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
            const reorderPoint = (product as any).reorderPoint ?? 10;

            if (currentStock > reorderPoint) continue;

            // Sales velocity: units sold per day over last 30 days
            const totalSold = product.saleItems.reduce((sum, si) => sum + si.quantity, 0);
            const dailyVelocity = totalSold / 30;

            // Lead time assumption: 3 days. Order enough for 30 days + safety stock (7 days)
            const daysToReorder = 30 + 7;
            const suggestedQty = Math.max(
                Math.ceil(dailyVelocity * daysToReorder) - currentStock,
                reorderPoint * 2 // minimum order = 2x reorder point
            );

            // Days of stock remaining
            const daysRemaining = dailyVelocity > 0 ? Math.floor(currentStock / dailyVelocity) : 999;
            const urgency = daysRemaining <= 3 ? 'critical' : daysRemaining <= 7 ? 'high' : 'normal';

            reorderItems.push({
                id: product.id,
                name: product.name,
                barcode: product.barcode,
                vendor: product.vendor,
                category: product.category,
                currentStock,
                reorderPoint,
                suggestedQty,
                dailyVelocity: Math.round(dailyVelocity * 10) / 10,
                daysRemaining: daysRemaining > 365 ? 999 : daysRemaining,
                estimatedCost: Math.round(suggestedQty * product.costPrice * 100) / 100,
                urgency
            });
        }

        // Sort: critical first, then high, then by days remaining
        const urgencyOrder: Record<string, number> = { critical: 0, high: 1, normal: 2 };
        reorderItems.sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2) || a.daysRemaining - b.daysRemaining);

        // Group by vendor for summary
        const byVendor: Record<string, typeof reorderItems> = {};
        for (const item of reorderItems) {
            const vendor = item.vendor || 'Unknown Vendor';
            if (!byVendor[vendor]) byVendor[vendor] = [];
            byVendor[vendor].push(item);
        }

        const vendorSummary = Object.entries(byVendor).map(([vendor, items]) => ({
            vendor,
            itemCount: items.length,
            totalEstimatedCost: Math.round(items.reduce((sum, i) => sum + i.estimatedCost, 0) * 100) / 100,
            hasCritical: items.some(i => i.urgency === 'critical')
        }));

        res.json({
            items: reorderItems,
            totalItems: reorderItems.length,
            totalEstimatedCost: Math.round(reorderItems.reduce((sum, i) => sum + i.estimatedCost, 0) * 100) / 100,
            criticalCount: reorderItems.filter(i => i.urgency === 'critical').length,
            byVendor: vendorSummary
        });
    } catch (e) {
        console.error('Reorder list error:', e);
        res.status(500).json({ message: 'Failed to generate reorder list' });
    }
};

// Generate a supplier email draft for a set of products
export const generateReorderEmail = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { vendorName, productIds } = req.body;
        if (!vendorName || !productIds?.length) {
            return res.status(400).json({ message: 'vendorName and productIds required' });
        }

        const store = await prisma.store.findUnique({ where: { id: storeId } });
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const products = await prisma.product.findMany({
            where: { storeId, id: { in: productIds } },
            include: {
                inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
                saleItems: { where: { sale: { dateTime: { gte: thirtyDaysAgo } } } }
            }
        });

        const lineItems = products.map(p => {
            const currentStock = p.inventorySnapshots[0]?.quantityOnHand ?? p.initialStock ?? 0;
            const totalSold = p.saleItems.reduce((sum, si) => sum + si.quantity, 0);
            const dailyVelocity = totalSold / 30;
            const suggestedQty = Math.max(
                Math.ceil(dailyVelocity * 37) - currentStock,
                ((p as any).reorderPoint ?? 10) * 2
            );
            return { name: p.name, barcode: p.barcode, qty: suggestedQty, unitCost: p.costPrice };
        });

        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const totalCost = lineItems.reduce((sum, l) => sum + l.qty * l.unitCost, 0);

        const emailBody = `Subject: Purchase Order Request — ${store?.name || 'Our Store'} — ${today}

Dear ${vendorName} Team,

I hope this message finds you well. We would like to place a purchase order for the following items:

${lineItems.map(l => `  • ${l.name}${l.barcode ? ` (Barcode: ${l.barcode})` : ''} — Qty: ${l.qty} units`).join('\n')}

Estimated total order value: $${totalCost.toFixed(2)}

Please confirm availability and expected delivery time at your earliest convenience. We would appreciate delivery within 3 business days if possible.

If there are any issues with availability or pricing changes, please contact us before processing the order.

Thank you for your continued partnership.

Best regards,
${store?.name || 'Store Management'}
${store?.address || ''}`;

        res.json({
            subject: `Purchase Order Request — ${store?.name || 'Our Store'} — ${today}`,
            body: emailBody,
            vendorName,
            lineItems,
            totalCost: Math.round(totalCost * 100) / 100
        });
    } catch (e) {
        console.error('Reorder email error:', e);
        res.status(500).json({ message: 'Failed to generate reorder email' });
    }
};

// Mark items as ordered
export const markAsOrdered = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { productIds } = req.body;
        // Create an alert noting the order was placed
        for (const productId of (productIds || [])) {
            const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
            if (!product) continue;
            await prisma.alert.create({
                data: {
                    storeId,
                    type: 'reorder_placed',
                    priority: 'info',
                    title: `Reorder Placed: ${product.name}`,
                    message: `A reorder was marked as placed for ${product.name}.`,
                    action: 'Awaiting delivery. Update stock when received.',
                    productId
                }
            });
        }
        res.json({ message: 'Marked as ordered', count: productIds?.length || 0 });
    } catch (e) {
        res.status(500).json({ message: 'Failed to mark as ordered' });
    }
};
