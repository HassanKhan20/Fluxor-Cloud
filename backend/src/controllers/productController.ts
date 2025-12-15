import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Helper to get storeId from request (assuming auth middleware attaches user/store info)
// For MVP, we'll assume the storeId is passed in headers or body, 
// OR simpler: we extract it from the authenticated user's active store context.
// Let's assume for now the frontend sends `x-store-id` header or we look up the user's first store.
const getStoreId = async (req: Request): Promise<string | null> => {
    // @ts-ignore - implicitly added by auth middleware (which we need to implement fully)
    const userId = req.user?.userId;
    if (!userId) return null;

    // Quick lookup for the user's store
    const membership = await prisma.storeMembership.findFirst({
        where: { userId }
    });
    return membership?.storeId || null;
};

export const getProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const products = await prisma.product.findMany({
            where: { storeId },
            orderBy: { name: 'asc' },
            include: {
                inventorySnapshots: {
                    orderBy: { snapshotDate: 'desc' },
                    take: 1
                }
            }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { name, barcode, sellingPrice, costPrice, category } = req.body;

        const product = await prisma.product.create({
            data: {
                storeId,
                name,
                barcode,
                sellingPrice: parseFloat(sellingPrice),
                costPrice: parseFloat(costPrice),
                category,
                // Initialize inventory to 0 if not provided
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
        const { id } = req.params;
        const { name, sellingPrice, costPrice, isActive } = req.body;

        const product = await prisma.product.update({
            where: { id },
            data: {
                name,
                sellingPrice: parseFloat(sellingPrice),
                costPrice: parseFloat(costPrice),
                isActive
            }
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error updating product' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Soft delete ideally, but hard delete for MVP if no constraints
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted' });
    } catch (error) {
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
        const { id } = req.params;
        const { initialStock } = req.body;

        if (initialStock === undefined || initialStock < 0) {
            return res.status(400).json({ message: 'Initial stock must be a non-negative number' });
        }

        // Update the product's initial stock
        const product = await prisma.product.update({
            where: { id },
            data: { initialStock: parseInt(initialStock) }
        });

        // Also update the latest inventory snapshot to match
        await prisma.inventorySnapshot.updateMany({
            where: { productId: id },
            data: { quantityOnHand: parseInt(initialStock) }
        });

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error setting initial stock' });
    }
};

// Bulk set initial stock for multiple products
export const bulkSetInitialStock = async (req: Request, res: Response) => {
    try {
        const { products } = req.body; // Array of { id, initialStock }

        if (!Array.isArray(products)) {
            return res.status(400).json({ message: 'Products must be an array' });
        }

        for (const p of products) {
            if (p.initialStock !== undefined && p.initialStock >= 0) {
                await prisma.product.update({
                    where: { id: p.id },
                    data: { initialStock: parseInt(p.initialStock) }
                });
                await prisma.inventorySnapshot.updateMany({
                    where: { productId: p.id },
                    data: { quantityOnHand: parseInt(p.initialStock) }
                });
            }
        }

        res.json({ message: 'Initial stock updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error setting bulk initial stock' });
    }
};

// Match an unmatched product to an existing product or mark as resolved
export const matchProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { targetProductId, action } = req.body; // action: 'merge' | 'keep'

        if (action === 'keep') {
            // Just mark as no longer unmatched
            await prisma.product.update({
                where: { id },
                data: { isUnmatched: false }
            });
            return res.json({ message: 'Product marked as reviewed' });
        }

        if (action === 'merge' && targetProductId) {
            // Transfer all sale items to target product, then delete unmatched
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
            return res.json({ message: 'Product merged successfully' });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
        res.status(500).json({ message: 'Error matching product' });
    }
};
