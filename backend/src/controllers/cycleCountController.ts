// Cycle-count assistant. Surfaces the high-shrink SKUs (tobacco, lottery,
// energy drinks) that owners hand-count on Sunday nights, and accepts a
// counted quantity to write a fresh InventorySnapshot. The wedge: incumbents
// bury this in a long inventory-audit flow; we make it a focused 5-minute
// mobile pass on the SKUs that actually drift.

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';

const HIGH_SHRINK_RE = /\b(cigarette|cigar|tobacco|smokeless|vape|otp|lottery|scratcher|red bull|monster|rockstar|energy)\b/i;

export const getCycleCountList = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const products = await prisma.product.findMany({
            where: { storeId, isActive: true },
            include: {
                inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
                saleItems: {
                    where: { sale: { dateTime: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
                    select: { quantity: true }
                }
            }
        });

        const rows = products
            .filter(p => {
                if (HIGH_SHRINK_RE.test(p.name)) return true;
                if (p.category && HIGH_SHRINK_RE.test(p.category)) return true;
                if (p.brand && HIGH_SHRINK_RE.test(p.brand)) return true;
                return false;
            })
            .map(p => {
                const stock = p.inventorySnapshots[0]?.quantityOnHand ?? p.initialStock ?? 0;
                const sold14 = p.saleItems.reduce((s, i) => s + i.quantity, 0);
                const lastCountAt = p.inventorySnapshots[0]?.snapshotDate ?? null;
                const daysSinceCount = lastCountAt
                    ? Math.floor((Date.now() - new Date(lastCountAt).getTime()) / (24 * 60 * 60 * 1000))
                    : null;
                return {
                    productId: p.id,
                    name: p.name,
                    category: p.category,
                    brand: p.brand,
                    sku: p.sku,
                    barcode: p.barcode,
                    expectedStock: stock,
                    sold14d: sold14,
                    lastCountAt,
                    daysSinceCount
                };
            })
            .sort((a, b) => {
                // Prioritize: never-counted, then longest-since-count, then highest sales
                const ad = a.daysSinceCount ?? 9999;
                const bd = b.daysSinceCount ?? 9999;
                if (ad !== bd) return bd - ad;
                return b.sold14d - a.sold14d;
            });

        res.json({ rows, count: rows.length });
    } catch (err: any) {
        console.error('[CycleCount] List failed:', err);
        res.status(500).json({ message: err?.message || 'Failed to load cycle-count list' });
    }
};

export const submitCycleCount = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { counts } = req.body as { counts: { productId: string; counted: number }[] };
        if (!Array.isArray(counts) || counts.length === 0) {
            return res.status(400).json({ message: 'counts array required' });
        }

        const variances: { productId: string; name: string; expected: number; counted: number; variance: number }[] = [];

        for (const c of counts) {
            if (typeof c.productId !== 'string' || !isFinite(c.counted) || c.counted < 0) continue;
            const product = await prisma.product.findFirst({
                where: { id: c.productId, storeId },
                include: { inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 } }
            });
            if (!product) continue;

            const expected = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
            await prisma.inventorySnapshot.create({
                data: { storeId, productId: product.id, quantityOnHand: Math.round(c.counted) }
            });
            variances.push({
                productId: product.id,
                name: product.name,
                expected,
                counted: Math.round(c.counted),
                variance: Math.round(c.counted) - expected
            });
        }

        res.json({ saved: variances.length, variances });
    } catch (err: any) {
        console.error('[CycleCount] Submit failed:', err);
        res.status(500).json({ message: err?.message || 'Failed to save counts' });
    }
};
