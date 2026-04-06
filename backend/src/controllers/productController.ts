import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
        const skip = (page - 1) * limit;
        const search = req.query.search as string | undefined;

        const where: any = { storeId };
        if (search && search.trim()) {
            where.OR = [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { barcode: { contains: search.trim() } },
                { sku: { contains: search.trim() } },
            ];
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
                include: {
                    inventorySnapshots: {
                        orderBy: { snapshotDate: 'desc' },
                        take: 1
                    }
                }
            }),
            prisma.product.count({ where })
        ]);

        res.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { name, barcode, sellingPrice, costPrice, category } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: 'Product name is required' });
        }
        if (name.trim().length > 255) {
            return res.status(400).json({ message: 'Product name must be under 255 characters' });
        }

        const parsedSelling = parseFloat(sellingPrice);
        const parsedCost = parseFloat(costPrice);

        if (isNaN(parsedSelling) || parsedSelling < 0) {
            return res.status(400).json({ message: 'Selling price must be a non-negative number' });
        }
        if (isNaN(parsedCost) || parsedCost < 0) {
            return res.status(400).json({ message: 'Cost price must be a non-negative number' });
        }

        const product = await prisma.product.create({
            data: {
                storeId,
                name: name.trim(),
                barcode: barcode?.trim() || undefined,
                sellingPrice: parsedSelling,
                costPrice: parsedCost,
                category: category?.trim() || undefined,
                inventorySnapshots: {
                    create: {
                        storeId,
                        quantityOnHand: 0
                    }
                }
            }
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error creating product' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;

        // Verify product belongs to this store
        const existing = await prisma.product.findFirst({ where: { id, storeId } });
        if (!existing) return res.status(404).json({ message: 'Product not found' });

        const { name, sellingPrice, costPrice, isActive } = req.body;

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            return res.status(400).json({ message: 'Product name cannot be empty' });
        }

        const parsedSelling = sellingPrice !== undefined ? parseFloat(sellingPrice) : undefined;
        const parsedCost = costPrice !== undefined ? parseFloat(costPrice) : undefined;

        if (parsedSelling !== undefined && (isNaN(parsedSelling) || parsedSelling < 0)) {
            return res.status(400).json({ message: 'Selling price must be a non-negative number' });
        }
        if (parsedCost !== undefined && (isNaN(parsedCost) || parsedCost < 0)) {
            return res.status(400).json({ message: 'Cost price must be a non-negative number' });
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(parsedSelling !== undefined && { sellingPrice: parsedSelling }),
                ...(parsedCost !== undefined && { costPrice: parsedCost }),
                ...(isActive !== undefined && { isActive: Boolean(isActive) })
            }
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error updating product' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;

        // Verify product belongs to this store
        const existing = await prisma.product.findFirst({ where: { id, storeId } });
        if (!existing) return res.status(404).json({ message: 'Product not found' });

        await prisma.$transaction([
            prisma.saleItem.deleteMany({ where: { productId: id } }),
            prisma.invoiceItem.deleteMany({ where: { productId: id } }),
            prisma.inventorySnapshot.deleteMany({ where: { productId: id } }),
            prisma.product.delete({ where: { id } }),
        ]);

        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};

// Get unmatched products that need review
export const getUnmatchedProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const unmatchedProducts = await prisma.product.findMany({
            where: { storeId, isUnmatched: true },
            orderBy: { name: 'asc' },
            include: {
                inventorySnapshots: {
                    orderBy: { snapshotDate: 'desc' },
                    take: 1
                }
            }
        });
        res.json(unmatchedProducts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unmatched products' });
    }
};

// Set initial stock for a product
export const setInitialStock = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;

        // Verify product belongs to this store
        const existing = await prisma.product.findFirst({ where: { id, storeId } });
        if (!existing) return res.status(404).json({ message: 'Product not found' });

        const { initialStock } = req.body;

        const parsedStock = parseInt(initialStock, 10);
        if (isNaN(parsedStock) || parsedStock < 0) {
            return res.status(400).json({ message: 'Initial stock must be a non-negative number' });
        }

        const product = await prisma.product.update({
            where: { id },
            data: { initialStock: parsedStock }
        });

        await prisma.inventorySnapshot.updateMany({
            where: { productId: id },
            data: { quantityOnHand: parsedStock }
        });

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error setting initial stock' });
    }
};

// Bulk set initial stock for multiple products
export const bulkSetInitialStock = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { products } = req.body;

        if (!Array.isArray(products)) {
            return res.status(400).json({ message: 'Products must be an array' });
        }

        // Verify all products belong to this store before modifying any
        const ids = products.map((p: any) => p.id).filter(Boolean);
        const owned = await prisma.product.findMany({
            where: { id: { in: ids }, storeId },
            select: { id: true }
        });
        const ownedIds = new Set(owned.map(p => p.id));

        for (const p of products) {
            if (!ownedIds.has(p.id)) continue; // Skip products not owned by this store
            const parsedStock = parseInt(p.initialStock, 10);
            if (!isNaN(parsedStock) && parsedStock >= 0) {
                await prisma.product.update({
                    where: { id: p.id },
                    data: { initialStock: parsedStock }
                });
                await prisma.inventorySnapshot.updateMany({
                    where: { productId: p.id },
                    data: { quantityOnHand: parsedStock }
                });
            }
        }

        res.json({ message: 'Initial stock updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error setting bulk initial stock' });
    }
};

// Delete ALL products for the store (demo account only)
export const deleteAllProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        // Only allow for demo account
        // @ts-ignore
        const userId = req.user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.email !== (process.env.DEMO_EMAIL || 'demo@fluxor.cloud')) {
            return res.status(403).json({ message: 'This action is only available for the demo account' });
        }

        // Delete everything for this store
        await prisma.$transaction([
            prisma.saleItem.deleteMany({ where: { sale: { storeId } } }),
            prisma.sale.deleteMany({ where: { storeId } }),
            prisma.invoiceItem.deleteMany({ where: { invoice: { storeId } } }),
            prisma.invoice.deleteMany({ where: { storeId } }),
            prisma.inventorySnapshot.deleteMany({ where: { product: { storeId } } }),
            prisma.product.deleteMany({ where: { storeId } }),
            prisma.alert.deleteMany({ where: { storeId } }),
            prisma.chatMessage.deleteMany({ where: { storeId } }),
        ]);

        res.json({ message: 'All data deleted for this store' });
    } catch (error) {
        console.error('Delete all error:', error);
        res.status(500).json({ message: 'Error deleting data' });
    }
};

// Cleanup garbage products (PDF artifacts, binary strings, etc)
export const cleanupGarbageProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const products = await prisma.product.findMany({ where: { storeId }, select: { id: true, name: true } });

        const garbageIds: string[] = [];
        for (const p of products) {
            const name = p.name;
            if (!name || name.length < 2) { garbageIds.push(p.id); continue; }
            // Must contain at least one letter
            if (!/[a-zA-Z]/.test(name)) { garbageIds.push(p.id); continue; }
            // PDF object markers: "10 0 obj", "0 17"
            if (/^\d+\s+\d+(\s+obj)?$/.test(name.trim())) { garbageIds.push(p.id); continue; }
            if (/\d{5,}\s+\d{5}\s+[nf]/.test(name)) { garbageIds.push(p.id); continue; }
            // PDF metadata
            if (/reportlab|generated|pdf\s*document|opensource|endobj|startxref|xref|trailer|stream|obj\b/i.test(name)) { garbageIds.push(p.id); continue; }
            // Binary / control characters
            if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(name)) { garbageIds.push(p.id); continue; }
            // >30% special characters
            const nonAlpha = name.replace(/[a-zA-Z0-9\s\-'&.,/()]/g, '').length;
            if (name.length > 3 && nonAlpha / name.length > 0.3) { garbageIds.push(p.id); continue; }
            // Pure numbers/hex
            if (/^[\d\s.]+$/.test(name.trim())) { garbageIds.push(p.id); continue; }
            if (/^[0-9A-Fa-f\s]+$/.test(name) && name.length > 4) { garbageIds.push(p.id); continue; }
        }

        if (garbageIds.length === 0) {
            return res.json({ message: 'No garbage products found', deleted: 0 });
        }

        // Delete related records first, then the products
        await prisma.$transaction([
            prisma.saleItem.deleteMany({ where: { productId: { in: garbageIds } } }),
            prisma.invoiceItem.deleteMany({ where: { productId: { in: garbageIds } } }),
            prisma.inventorySnapshot.deleteMany({ where: { productId: { in: garbageIds } } }),
            prisma.product.deleteMany({ where: { id: { in: garbageIds } } }),
        ]);

        res.json({ message: `Cleaned up ${garbageIds.length} garbage product(s)`, deleted: garbageIds.length });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ message: 'Error cleaning up products' });
    }
};

// Export products as CSV
export const exportProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const products = await prisma.product.findMany({
            where: { storeId },
            orderBy: { name: 'asc' },
            include: { inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 } }
        });

        const headers = 'Product Name,SKU,Barcode,Category,Vendor,Cost Price,Selling Price,Stock,Status\n';
        const rows = products.map(p => {
            const stock = p.inventorySnapshots[0]?.quantityOnHand ?? 'N/A';
            return [
                `"${(p.name || '').replace(/"/g, '""')}"`,
                p.sku || '',
                p.barcode || '',
                `"${(p.category || '').replace(/"/g, '""')}"`,
                `"${(p.vendor || '').replace(/"/g, '""')}"`,
                p.costPrice.toFixed(2),
                p.sellingPrice.toFixed(2),
                stock,
                p.isActive ? 'Active' : 'Inactive'
            ].join(',');
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=products_export.csv');
        res.send(headers + rows);
    } catch (error) {
        res.status(500).json({ message: 'Error exporting products' });
    }
};

// Match an unmatched product to an existing product or mark as resolved
export const matchProduct = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;
        const { targetProductId, action, name, category, sellingPrice, barcode } = req.body;

        // Verify product belongs to this store
        const existing = await prisma.product.findFirst({ where: { id, storeId } });
        if (!existing) return res.status(404).json({ message: 'Product not found' });

        if (action === 'keep') {
            const updates: any = { isUnmatched: false };

            if (name) updates.name = String(name).trim();
            if (category) updates.category = String(category).trim();
            if (sellingPrice !== undefined) {
                const parsed = parseFloat(sellingPrice);
                if (!isNaN(parsed) && parsed >= 0) updates.sellingPrice = parsed;
            }
            if (barcode) updates.barcode = String(barcode).trim();

            const product = await prisma.product.update({
                where: { id },
                data: updates
            });

            console.log(`[CONFIRM] Product confirmed: ${product.name} (barcode: ${product.barcode})`);
            return res.json({ message: 'Product marked as reviewed', product });
        }

        if (action === 'merge' && targetProductId) {
            // Verify target product also belongs to this store
            const target = await prisma.product.findFirst({ where: { id: targetProductId, storeId } });
            if (!target) return res.status(404).json({ message: 'Target product not found' });

            await prisma.saleItem.updateMany({
                where: { productId: id },
                data: { productId: targetProductId }
            });
            await prisma.invoiceItem.updateMany({
                where: { productId: id },
                data: { productId: targetProductId }
            });
            await prisma.inventorySnapshot.deleteMany({ where: { productId: id } });
            await prisma.product.delete({ where: { id } });
            console.log(`[MERGE] Product merged into ${targetProductId}`);
            return res.json({ message: 'Product merged successfully' });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
        console.error('[ERROR] matchProduct:', error);
        res.status(500).json({ message: 'Error matching product' });
    }
};
