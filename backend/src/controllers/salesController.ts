import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import csv from 'csv-parser';
import crypto from 'crypto';

interface SaleRow {
    receiptId: string;
    date: string;
    productName: string;
    barcode: string;
    sku: string;
    category: string;
    quantity: string;
    unitPrice: string;
    paymentMethod: string;
}

interface ValidationError {
    row: number;
    field: string;
    value: string;
    message: string;
}

interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: string[];
    validRows: SaleRow[];
    totalRows: number;
}

// Column name mappings (support multiple CSV formats)
const COLUMN_MAPPINGS: Record<string, string[]> = {
    receiptId: ['receiptId', 'receipt', 'Receipt', 'Receipt ID', 'receipt_id', 'ReceiptID', 'Transaction ID'],
    date: ['date', 'Date', 'DateTime', 'datetime', 'Transaction Date', 'Sale Date', 'Time'],
    productName: ['productName', 'product', 'Product', 'Description', 'description', 'Item', 'item', 'Product Name'],
    barcode: ['barcode', 'Barcode', 'UPC', 'upc', 'Product Code'],
    sku: ['sku', 'SKU', 'Item Code', 'item_code', 'ItemCode'],
    category: ['category', 'Category', 'Department', 'department', 'Type'],
    quantity: ['quantity', 'Quantity', 'Qty', 'qty', 'Amount', 'Count'],
    unitPrice: ['unitPrice', 'Unit Price', 'unit_price', 'Price', 'price', 'Unit Cost'],
    paymentMethod: ['paymentMethod', 'Payment Method', 'payment', 'Payment', 'Method']
};

// Required fields
const REQUIRED_FIELDS = ['productName', 'quantity', 'unitPrice'];

// Helper: Get Store ID
const getStoreId = async (req: Request): Promise<string | null> => {
    // @ts-ignore
    const userId = req.user?.userId;
    if (!userId) return null;
    const membership = await prisma.storeMembership.findFirst({ where: { userId } });
    return membership?.storeId || null;
};

// Helper: Generate hash for idempotency
function generateImportHash(receiptId: string, date: string, items: string): string {
    const content = `${receiptId}|${date}|${items}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

// Helper: Normalize column names
function normalizeHeaders(headers: string[]): { mapping: Record<string, string>, missing: string[] } {
    const mapping: Record<string, string> = {};
    const foundFields: string[] = [];

    for (const [standardName, aliases] of Object.entries(COLUMN_MAPPINGS)) {
        for (const header of headers) {
            const trimmedHeader = header.trim();
            if (aliases.some(alias => alias.toLowerCase() === trimmedHeader.toLowerCase())) {
                mapping[trimmedHeader] = standardName;
                foundFields.push(standardName);
                break;
            }
        }
    }

    const missing = REQUIRED_FIELDS.filter(f => !foundFields.includes(f));
    return { mapping, missing };
}

// Helper: Parse DateTime
function parseDateTime(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;
    const trimmed = dateStr.trim();

    // MM/DD/YYYY HH:mm
    const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (mmddyyyyMatch) {
        const [, month, day, year, hours, minutes] = mmddyyyyMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    }

    // MM/DD/YYYY
    const mmddyyyyOnlyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyOnlyMatch) {
        const [, month, day, year] = mmddyyyyOnlyMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    const parsed = new Date(trimmed);
    return !isNaN(parsed.getTime()) ? parsed : null;
}

// Helper: Validate row
function validateRow(row: any, rowNumber: number, headerMapping: Record<string, string>): { errors: ValidationError[], normalized: SaleRow | null } {
    const errors: ValidationError[] = [];
    const normalized: any = {};

    for (const [csvColumn, standardName] of Object.entries(headerMapping)) {
        normalized[standardName] = row[csvColumn] || '';
    }

    if (!normalized.productName || normalized.productName.trim() === '') {
        errors.push({ row: rowNumber, field: 'productName', value: normalized.productName || '', message: 'Product name is required' });
    }

    const qty = parseFloat(normalized.quantity);
    if (isNaN(qty) || qty <= 0) {
        errors.push({ row: rowNumber, field: 'quantity', value: normalized.quantity || '', message: 'Quantity must be a positive number' });
    }

    const price = parseFloat(normalized.unitPrice);
    if (isNaN(price) || price < 0) {
        errors.push({ row: rowNumber, field: 'unitPrice', value: normalized.unitPrice || '', message: 'Unit price must be a valid number' });
    }

    return {
        errors,
        normalized: errors.length === 0 ? normalized : null
    };
}

// Validate CSV endpoint
export const validateSalesCsv = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded', errors: [] });
        }

        const fileName = req.file.originalname.toLowerCase();
        if (!fileName.endsWith('.csv')) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Only CSV files are accepted', errors: [] });
        }

        const maxSize = 10 * 1024 * 1024;
        if (req.file.size > maxSize) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'File size exceeds 10MB limit', errors: [] });
        }

        const result: ValidationResult = { isValid: true, errors: [], warnings: [], validRows: [], totalRows: 0 };
        let headerMapping: Record<string, string> = {};
        let rowNumber = 0;

        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(req.file!.path, { encoding: 'utf8' })
                .on('error', (error) => { result.isValid = false; reject(error); })
                .pipe(csv())
                .on('headers', (csvHeaders: string[]) => {
                    const { mapping, missing } = normalizeHeaders(csvHeaders);
                    headerMapping = mapping;
                    if (missing.length > 0) {
                        result.isValid = false;
                        missing.forEach(field => {
                            result.errors.push({ row: 0, field, value: '', message: `Required column "${field}" not found` });
                        });
                    }
                })
                .on('data', (row: any) => {
                    rowNumber++;
                    result.totalRows = rowNumber;
                    if (Object.keys(headerMapping).length >= REQUIRED_FIELDS.length) {
                        const { errors, normalized } = validateRow(row, rowNumber, headerMapping);
                        if (errors.length > 0) {
                            result.errors.push(...errors);
                            result.isValid = false;
                        }
                        if (normalized) result.validRows.push(normalized);
                    }
                })
                .on('end', () => resolve())
                .on('error', () => resolve());
        }).catch(() => { });

        if (result.totalRows === 0 && result.errors.length === 0) {
            result.isValid = false;
            result.errors.push({ row: 0, field: 'file', value: '', message: 'CSV file is empty' });
        }

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.json({
            success: result.isValid,
            message: result.isValid ? `${result.validRows.length} rows ready to import` : `${result.errors.length} error(s) found`,
            totalRows: result.totalRows,
            validRows: result.validRows.length,
            errors: result.errors.slice(0, 20),
            preview: result.validRows.slice(0, 5)
        });
    } catch (error: any) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message || 'Validation failed', errors: [] });
    }
};

// Upload and process CSV
export const uploadSalesCsv = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const fileName = req.file.originalname.toLowerCase();
        if (!fileName.endsWith('.csv')) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Only CSV files are accepted' });
        }

        const results: SaleRow[] = [];
        const errors: ValidationError[] = [];
        let headerMapping: Record<string, string> = {};
        let rowNumber = 0;

        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(req.file!.path, { encoding: 'utf8' })
                .on('error', reject)
                .pipe(csv())
                .on('headers', (csvHeaders: string[]) => {
                    const { mapping, missing } = normalizeHeaders(csvHeaders);
                    headerMapping = mapping;
                    if (missing.length > 0) reject(new Error(`Missing columns: ${missing.join(', ')}`));
                })
                .on('data', (row: any) => {
                    rowNumber++;
                    const { errors: rowErrors, normalized } = validateRow(row, rowNumber, headerMapping);
                    if (normalized) results.push(normalized);
                    errors.push(...rowErrors.filter(e => !e.message.startsWith('Warning')));
                })
                .on('end', () => resolve())
                .on('error', reject);
        });

        if (results.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'No valid data found' });
        }

        const importResult = await processSalesData(storeId, results);

        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: 'Sales data imported successfully',
            imported: importResult.imported,
            skipped: importResult.skipped,
            duplicates: importResult.duplicates
        });
    } catch (error: any) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message || 'Error processing CSV' });
    }
};

/**
 * FIXED: processSalesData with idempotency, proper identity resolution, and learning mode
 */
async function processSalesData(storeId: string, rows: SaleRow[]): Promise<{ imported: number; skipped: number; duplicates: number }> {
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;

    // Group by Receipt ID
    const salesMap = new Map<string, SaleRow[]>();
    for (const row of rows) {
        const key = row.receiptId || `GEN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        if (!salesMap.has(key)) salesMap.set(key, []);
        salesMap.get(key)?.push(row);
    }

    for (const [receiptId, items] of salesMap) {
        // Generate import hash for idempotency
        const itemsString = items.map(i => `${i.productName}|${i.quantity}|${i.unitPrice}`).sort().join(';');
        const importHash = generateImportHash(receiptId, items[0].date || '', itemsString);

        // CHECK IDEMPOTENCY: Skip if already imported
        const existingSale = await prisma.sale.findFirst({
            where: { storeId, importHash }
        });

        if (existingSale) {
            duplicates++;
            continue; // Skip - already processed
        }

        let totalAmount = 0;
        const validItems: Array<{ product: any; qty: number; price: number }> = [];

        for (const item of items) {
            const qty = parseFloat(item.quantity) || 1;
            const price = parseFloat(item.unitPrice) || 0; // CRITICAL: Use unitPrice, NOT total
            totalAmount += qty * price;

            const normalizedBarcode = item.barcode?.trim() || null;
            const normalizedSku = item.sku?.trim() || null;
            const normalizedName = item.productName?.trim() || null;
            const normalizedCategory = item.category?.trim() || null;

            let product = null;

            // PRODUCT IDENTITY RESOLUTION (STRICT ORDER)
            // 1. Barcode (absolute identifier)
            if (normalizedBarcode && normalizedBarcode !== '') {
                product = await prisma.product.findFirst({
                    where: { storeId, barcode: normalizedBarcode }
                });
            }

            // 2. SKU (if no barcode match)
            if (!product && normalizedSku && normalizedSku !== '') {
                product = await prisma.product.findFirst({
                    where: { storeId, sku: normalizedSku }
                });
            }

            // 3. Normalized name (last resort)
            if (!product && normalizedName && normalizedName !== '') {
                const existingProducts = await prisma.product.findMany({ where: { storeId } });
                product = existingProducts.find(p =>
                    p.name.toLowerCase().trim() === normalizedName.toLowerCase()
                );
            }

            // Create new product if not found
            if (!product) {
                product = await prisma.product.create({
                    data: {
                        storeId,
                        name: normalizedName || 'Unnamed Item',
                        barcode: normalizedBarcode,
                        sku: normalizedSku,
                        category: normalizedCategory || 'Uncategorized',
                        sellingPrice: price,
                        costPrice: price * 0.7,
                        isUnmatched: true,
                        isConfirmed: false,
                        importCount: 1,
                        initialStock: null,
                        inventorySnapshots: { create: { storeId, quantityOnHand: 0 } }
                    }
                });
            } else {
                // UPDATE EXISTING PRODUCT (only if NOT confirmed)
                if (!product.isConfirmed) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            // Only fill in missing fields, don't overwrite
                            barcode: product.barcode || normalizedBarcode,
                            sku: product.sku || normalizedSku,
                            category: product.category === 'Uncategorized' ? (normalizedCategory || product.category) : product.category,
                            sellingPrice: product.sellingPrice === 0 ? price : product.sellingPrice,
                            importCount: { increment: 1 }
                        }
                    });
                } else {
                    // Product is confirmed - only increment import count
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { importCount: { increment: 1 } }
                    });
                }
            }

            validItems.push({ product, qty, price });
        }

        // Create Sale Record with importHash for idempotency
        const firstItem = items[0];
        const date = parseDateTime(firstItem.date) || new Date();

        await prisma.sale.create({
            data: {
                storeId,
                totalAmount,
                source: 'CSV_IMPORT',
                dateTime: date,
                importHash,
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

        imported++;

        // INVENTORY UPDATE (only for new sales, not duplicates)
        for (const vi of validItems) {
            if (vi.product.initialStock !== null) {
                const latestSnapshot = await prisma.inventorySnapshot.findFirst({
                    where: { productId: vi.product.id },
                    orderBy: { snapshotDate: 'desc' }
                });

                if (latestSnapshot) {
                    const newQuantity = Math.max(0, latestSnapshot.quantityOnHand - vi.qty);
                    await prisma.inventorySnapshot.update({
                        where: { id: latestSnapshot.id },
                        data: { quantityOnHand: newQuantity }
                    });
                }
            }
        }
    }

    return { imported, skipped, duplicates };
}
