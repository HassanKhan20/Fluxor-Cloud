import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import csv from 'csv-parser';

interface SaleRow {
    receiptId: string;
    date: string;
    productName: string;
    barcode: string;
    quantity: string;
    unitPrice: string;
    paymentMethod: string;
}

// Helper: Get Store ID (reused logic, ideally in a shared util)
const getStoreId = async (req: Request): Promise<string | null> => {
    // @ts-ignore
    const userId = req.user?.userId;
    if (!userId) return null;
    const membership = await prisma.storeMembership.findFirst({ where: { userId } });
    return membership?.storeId || null;
};

export const uploadSalesCsv = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results: SaleRow[] = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                // Process the parsed CSV data
                await processSalesData(storeId, results);

                // Cleanup file
                fs.unlinkSync(req.file!.path);

                res.json({ message: 'Sales data ingested successfully', count: results.length });
            });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing CSV' });
    }
};

async function processSalesData(storeId: string, rows: SaleRow[]) {
    // Group by Receipt ID to create generic Sales
    const salesMap = new Map<string, SaleRow[]>();

    for (const row of rows) {
        const key = row.receiptId || `GEN-${Date.now()}-${Math.random()}`; // Fallback if no receipt ID
        if (!salesMap.has(key)) {
            salesMap.set(key, []);
        }
        salesMap.get(key)?.push(row);
    }

    for (const [receiptId, items] of salesMap) {
        // Calculate total
        let totalAmount = 0;
        const validItems = [];

        // 1. Ensure all products exist or create dummy ones
        for (const item of items) {
            const qty = parseFloat(item.quantity) || 1;
            const price = parseFloat(item.unitPrice) || 0;
            totalAmount += qty * price;

            // Find or create product
            let product = await prisma.product.findFirst({
                where: { storeId, OR: [{ barcode: item.barcode }, { name: item.productName }] }
            });

            if (!product) {
                // Auto-create product from CSV data
                product = await prisma.product.create({
                    data: {
                        storeId,
                        name: item.productName || 'Unknown Product',
                        barcode: item.barcode || 'NO-BARCODE',
                        sellingPrice: price,
                        costPrice: price * 0.7, // Estimate cost
                        category: 'Uncategorized',
                        inventorySnapshots: { create: { storeId, quantityOnHand: 0 } }
                    }
                });
            }
            validItems.push({ product, qty, price });
        }

        // 2. Create Sale Record
        const firstItem = items[0];
        const date = firstItem.date ? new Date(firstItem.date) : new Date();

        await prisma.sale.create({
            data: {
                storeId,
                totalAmount,
                // paymentMethod is not in schema, assuming source is enough or 'MANUAL_ENTRY' for now
                source: 'CSV_IMPORT',
                dateTime: isNaN(date.getTime()) ? new Date() : date,
                items: {
                    create: validItems.map(vi => ({
                        productId: vi.product.id,
                        quantity: vi.qty,
                        unitPrice: vi.price,
                        lineTotal: vi.qty * vi.price
                    }))
                }
            }
        });

        // 3. Update Inventory (simplified: decrease stock)
        for (const vi of validItems) {
            // This logic is simplified; real inventory needs snapshot tracking
            // We just decrement the latest snapshot for MVP
            const latestSnapshot = await prisma.inventorySnapshot.findFirst({
                where: { productId: vi.product.id },
                orderBy: { snapshotDate: 'desc' }
            });

            if (latestSnapshot) {
                await prisma.inventorySnapshot.update({
                    where: { id: latestSnapshot.id },
                    data: { quantityOnHand: { decrement: vi.qty } }
                });
            }
        }
    }
}
