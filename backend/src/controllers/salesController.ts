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

// Helper: Parse DateTime from various CSV formats
// Handles: "09/11/2025 08:42" (MM/DD/YYYY HH:mm), "2025-09-11", ISO format, etc.
function parseDateTime(dateStr: string): Date {
    if (!dateStr || dateStr.trim() === '') {
        return new Date();
    }

    const trimmed = dateStr.trim();

    // Try MM/DD/YYYY HH:mm format (Alliance POS style)
    const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (mmddyyyyMatch) {
        const [, month, day, year, hours, minutes] = mmddyyyyMatch;
        return new Date(
            parseInt(year),
            parseInt(month) - 1, // JS months are 0-indexed
            parseInt(day),
            parseInt(hours),
            parseInt(minutes)
        );
    }

    // Try MM/DD/YYYY format (without time)
    const mmddyyyyOnlyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyOnlyMatch) {
        const [, month, day, year] = mmddyyyyOnlyMatch;
        return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
        );
    }

    // Fallback: let JavaScript try to parse it
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    // Last resort: return current date
    console.warn(`Could not parse date: "${dateStr}", using current date`);
    return new Date();
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

            // Normalize identifiers for stable matching
            const normalizedBarcode = item.barcode?.trim() || null;
            const normalizedName = item.productName?.trim() || null;

            // Find product by stable identifier - PRIORITY: barcode > name
            let product = null;

            // Step 1: Try exact barcode match (highest priority)
            if (normalizedBarcode && normalizedBarcode !== '') {
                product = await prisma.product.findFirst({
                    where: { storeId, barcode: normalizedBarcode }
                });
                if (product) {
                    console.log(`[MATCH] Found product by barcode: ${normalizedBarcode} -> ${product.name}`);
                }
            }

            // Step 2: Try name match (case-insensitive)
            if (!product && normalizedName && normalizedName !== '') {
                // SQLite doesn't support mode: 'insensitive', so we use raw comparison
                const existingProducts = await prisma.product.findMany({
                    where: { storeId }
                });
                product = existingProducts.find(p =>
                    p.name.toLowerCase() === normalizedName.toLowerCase()
                );
                if (product) {
                    console.log(`[MATCH] Found product by name: ${normalizedName} -> ${product.id}`);
                    // If we matched by name but CSV has barcode, update the product with the barcode
                    if (normalizedBarcode && !product.barcode) {
                        await prisma.product.update({
                            where: { id: product.id },
                            data: { barcode: normalizedBarcode }
                        });
                        console.log(`[UPDATE] Added barcode ${normalizedBarcode} to product ${product.name}`);
                    }
                }
            }

            // Step 3: Create new product only if no match found
            if (!product) {
                // Use barcode as stable ID if available, otherwise generate one
                const stableBarcode = normalizedBarcode || `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

                console.log(`[CREATE] New unmatched product: ${normalizedName || 'Unnamed'} (barcode: ${stableBarcode})`);

                product = await prisma.product.create({
                    data: {
                        storeId,
                        name: normalizedName || 'Unnamed Item',
                        barcode: stableBarcode,
                        sellingPrice: price,
                        costPrice: price * 0.7, // Estimate cost
                        category: 'Uncategorized',
                        isUnmatched: true, // Flag for review
                        initialStock: null, // Not set - needs user input
                        inventorySnapshots: { create: { storeId, quantityOnHand: 0 } }
                    }
                });
            }

            // Price sanity check
            if (price > 500) {
                console.warn(`[WARN] Suspicious unit price $${price} for ${product.name} - might be total, not unit price`);
            }

            validItems.push({ product, qty, price });
        }

        // 2. Create Sale Record
        const firstItem = items[0];
        const date = parseDateTime(firstItem.date);

        await prisma.sale.create({
            data: {
                storeId,
                totalAmount,
                source: 'CSV_IMPORT',
                dateTime: date,
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

        // 3. Update Inventory - ONLY if initialStock is set, NEVER go negative
        for (const vi of validItems) {
            // Only decrement if the product has initialStock set (user has confirmed starting inventory)
            if (vi.product.initialStock !== null) {
                const latestSnapshot = await prisma.inventorySnapshot.findFirst({
                    where: { productId: vi.product.id },
                    orderBy: { snapshotDate: 'desc' }
                });

                if (latestSnapshot) {
                    // Calculate new quantity, ensuring it never goes below 0
                    const newQuantity = Math.max(0, latestSnapshot.quantityOnHand - vi.qty);
                    await prisma.inventorySnapshot.update({
                        where: { id: latestSnapshot.id },
                        data: { quantityOnHand: newQuantity }
                    });
                }
            }
            // If initialStock is null, we don't track inventory for this product yet
        }
    }
}
