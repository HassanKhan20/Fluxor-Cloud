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
