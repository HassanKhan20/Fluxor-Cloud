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
    vendor: string;
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
    receiptId: ['receiptId', 'receipt', 'Receipt', 'Receipt ID', 'receipt_id', 'ReceiptID', 'Transaction ID', 'Order ID', 'order_id', 'Invoice', 'invoice'],
    date: ['date', 'Date', 'DateTime', 'datetime', 'Transaction Date', 'Sale Date', 'Time', 'Timestamp', 'timestamp', 'Created', 'created_at', 'order_date'],
    productName: ['productName', 'product', 'Product', 'Description', 'description', 'Item', 'item', 'Product Name', 'Item Name', 'item_name', 'product_name', 'name', 'Name', 'Menu Item', 'LineItem'],
    barcode: ['barcode', 'Barcode', 'UPC', 'upc', 'Product Code', 'EAN', 'ean', 'GTIN', 'gtin'],
    sku: ['sku', 'SKU', 'Item Code', 'item_code', 'ItemCode', 'Product ID', 'product_id', 'Item Number', 'item_number'],
    category: ['category', 'Category', 'Department', 'department', 'Type', 'type', 'Group', 'group', 'Class', 'class'],
    quantity: ['quantity', 'Quantity', 'Qty', 'qty', 'Amount', 'Count', 'count', 'Units', 'units', 'Qty Sold', 'qty_sold'],
    unitPrice: ['unitPrice', 'Unit Price', 'unit_price', 'Price', 'price', 'Unit Cost', 'Rate', 'rate', 'Sell Price', 'sell_price', 'Amount', 'Total', 'total', 'Gross Sales', 'Net Sales'],
    paymentMethod: ['paymentMethod', 'Payment Method', 'payment', 'Payment', 'Method', 'Payment Type', 'payment_type', 'Tender'],
    vendor: ['vendor', 'Vendor', 'Supplier', 'supplier', 'Brand', 'brand', 'Manufacturer', 'manufacturer', 'Distributor', 'distributor']
};

// Required fields
const REQUIRED_FIELDS = ['productName', 'quantity', 'unitPrice'];

import { getStoreId } from '../lib/storeContext';

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

    // DD/MM/YYYY
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(d.getTime())) return d;
    }

    const parsed = new Date(trimmed);
    return !isNaN(parsed.getTime()) ? parsed : null;
}

// Helper: Clean price string — handles "$1,234.56", "(1.50)", "1.234,56" etc
function cleanPrice(val: string): number {
    if (!val || val.trim() === '') return 0;
    let s = val.trim();
    // Handle negative in parentheses: (5.00) → -5.00
    const isNeg = s.startsWith('(') && s.endsWith(')');
    s = s.replace(/[()]/g, '');
    // Remove currency symbols and spaces
    s = s.replace(/[$€£¥₹,\s]/g, '');
    const num = parseFloat(s);
    if (isNaN(num)) return 0;
    return isNeg ? -num : num;
}

// Helper: Clean quantity string
function cleanQuantity(val: string): number {
    if (!val || val.trim() === '') return 1;
    const num = parseFloat(val.trim().replace(/[,\s]/g, ''));
    return isNaN(num) || num <= 0 ? 1 : num;
}

// Helper: Detect if file content looks like CSV
function looksLikeCsv(content: string): boolean {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return false;
    // Check if first line has comma/tab/pipe separators
    const firstLine = lines[0];
    return firstLine.includes(',') || firstLine.includes('\t') || firstLine.includes('|');
}

// Helper: Validate row — lenient, skips bad rows instead of failing
function validateRow(row: any, rowNumber: number, headerMapping: Record<string, string>): { errors: ValidationError[], normalized: SaleRow | null } {
    const errors: ValidationError[] = [];
    const normalized: any = {};

    for (const [csvColumn, standardName] of Object.entries(headerMapping)) {
        normalized[standardName] = row[csvColumn] || '';
    }

    // Product name is truly required — skip row if missing
    if (!normalized.productName || normalized.productName.trim() === '') {
        errors.push({ row: rowNumber, field: 'productName', value: normalized.productName || '', message: 'Product name is required' });
    }

    // Quantity defaults to 1 if missing/invalid
    normalized.quantity = String(cleanQuantity(normalized.quantity));

    // Price defaults to 0 if missing/invalid
    normalized.unitPrice = String(cleanPrice(normalized.unitPrice));

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

        const ext = req.file.originalname.toLowerCase().split('.').pop() || '';

        // For non-CSV files, give a helpful message
        if (!['csv', 'tsv', 'txt'].includes(ext)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: `We received a .${ext} file. Please export your data as CSV from your POS system and upload that instead. Most POS systems have an "Export to CSV" option in their reports section.`,
                errors: []
            });
        }

        // Try to read the file and check if it's valid CSV
        let fileContent: string;
        try {
            fileContent = fs.readFileSync(req.file.path, 'utf8');
        } catch {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Could not read file. It may be corrupted.', errors: [] });
        }

        if (!looksLikeCsv(fileContent)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'This file does not appear to be a valid CSV. Make sure your file has column headers in the first row and comma-separated values.',
                errors: []
            });
        }

        const result: ValidationResult = { isValid: true, errors: [], warnings: [], validRows: [], totalRows: 0 };
        let headerMapping: Record<string, string> = {};
        let rowNumber = 0;

        await new Promise<void>((resolve) => {
            fs.createReadStream(req.file!.path, { encoding: 'utf8' })
                .on('error', () => resolve())
                .pipe(csv())
                .on('headers', (csvHeaders: string[]) => {
                    const { mapping, missing } = normalizeHeaders(csvHeaders);
                    headerMapping = mapping;
                    if (missing.length > 0) {
                        result.isValid = false;
                        missing.forEach(field => {
                            const suggestions = COLUMN_MAPPINGS[field]?.slice(0, 4).join(', ') || field;
                            result.errors.push({ row: 0, field, value: '', message: `Required column "${field}" not found. Expected one of: ${suggestions}` });
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
                        }
                        if (normalized) result.validRows.push(normalized);
                    }
                })
                .on('end', () => resolve())
                .on('error', () => resolve());
        });

        // If we got some valid rows despite errors, it's still partially valid
        if (result.validRows.length > 0 && result.errors.length > 0) {
            result.isValid = true;
            result.warnings.push(`${result.errors.length} row(s) had issues and will be skipped. ${result.validRows.length} row(s) are valid and will be imported.`);
        }

        if (result.totalRows === 0 && result.errors.length === 0) {
            result.isValid = false;
            result.errors.push({ row: 0, field: 'file', value: '', message: 'CSV file is empty or has no data rows' });
        }

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.json({
            success: result.isValid,
            message: result.isValid
                ? `${result.validRows.length} rows ready to import${result.warnings.length > 0 ? ' (with some warnings)' : ''}`
                : `${result.errors.length} error(s) found`,
            totalRows: result.totalRows,
            validRows: result.validRows.length,
            errors: result.errors.slice(0, 20),
            warnings: result.warnings,
            preview: result.validRows.slice(0, 5)
        });
    } catch (error: any) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'Failed to process file. It may be corrupted or in an unsupported format.', errors: [] });
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

        const ext = req.file.originalname.toLowerCase().split('.').pop() || '';

        if (!['csv', 'tsv', 'txt'].includes(ext)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: `We received a .${ext} file. Please export your data as CSV from your POS system. Most POS systems have an "Export to CSV" or "Download Report" option.`
            });
        }

        // Check if file is readable and looks like CSV
        let fileContent: string;
        try {
            fileContent = fs.readFileSync(req.file.path, 'utf8');
        } catch {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Could not read file. It may be corrupted.' });
        }

        if (!looksLikeCsv(fileContent)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'This file does not appear to be valid CSV data. Make sure it has column headers and comma-separated values.'
            });
        }

        const results: SaleRow[] = [];
        const skippedRows: number[] = [];
        let headerMapping: Record<string, string> = {};
        let rowNumber = 0;
        let headerError: string | null = null;

        await new Promise<void>((resolve) => {
            fs.createReadStream(req.file!.path, { encoding: 'utf8' })
                .on('error', () => resolve())
                .pipe(csv())
                .on('headers', (csvHeaders: string[]) => {
                    const { mapping, missing } = normalizeHeaders(csvHeaders);
                    headerMapping = mapping;
                    if (missing.length > 0) {
                        headerError = `Missing required columns: ${missing.join(', ')}. Your CSV needs at least: productName (or Product/Item/Description), quantity (or Qty), unitPrice (or Price).`;
                    }
                })
                .on('data', (row: any) => {
                    rowNumber++;
                    if (!headerError) {
                        const { normalized } = validateRow(row, rowNumber, headerMapping);
                        if (normalized) {
                            results.push(normalized);
                        } else {
                            skippedRows.push(rowNumber);
                        }
                    }
                })
                .on('end', () => resolve())
                .on('error', () => resolve());
        });

        if (headerError) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: headerError });
        }

        if (results.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: `No valid data found in ${rowNumber} rows. Make sure your CSV has product names, quantities, and prices.`
            });
        }

        const importResult = await processSalesData(storeId, results);

        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `Sales data imported successfully`,
            imported: importResult.imported,
            skipped: importResult.skipped + skippedRows.length,
            duplicates: importResult.duplicates,
            totalRows: rowNumber,
            validRows: results.length
        });
    } catch (error: any) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'Error processing file. Please check the format and try again.' });
    }
};

/**
 * processSalesData with idempotency, proper identity resolution, and learning mode
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
        const itemsString = items.map(i => `${i.productName}|${i.quantity}|${i.unitPrice}`).sort().join(';');
        const importHash = generateImportHash(receiptId, items[0].date || '', itemsString);

        const existingSale = await prisma.sale.findFirst({
            where: { storeId, importHash }
        });

        if (existingSale) {
            duplicates++;
            continue;
        }

        let totalAmount = 0;
        const validItems: Array<{ product: any; qty: number; price: number }> = [];

        for (const item of items) {
            const qty = cleanQuantity(item.quantity);
            const price = cleanPrice(item.unitPrice);
            totalAmount += qty * price;

            const normalizedBarcode = item.barcode?.trim() || null;
            const normalizedSku = item.sku?.trim() || null;
            const normalizedName = item.productName?.trim() || null;
            const normalizedCategory = item.category?.trim() || null;

            let product = null;

            // PRODUCT IDENTITY RESOLUTION
            if (normalizedBarcode && normalizedBarcode !== '') {
                product = await prisma.product.findFirst({
                    where: { storeId, barcode: normalizedBarcode }
                });
            }

            if (!product && normalizedSku && normalizedSku !== '') {
                product = await prisma.product.findFirst({
                    where: { storeId, sku: normalizedSku }
                });
            }

            if (!product && normalizedName && normalizedName !== '') {
                const existingProducts = await prisma.product.findMany({ where: { storeId } });
                product = existingProducts.find(p =>
                    p.name.toLowerCase().trim() === normalizedName.toLowerCase()
                );
            }

            if (!product) {
                const normalizedVendor = (item as any).vendor?.trim() || null;
                product = await prisma.product.create({
                    data: {
                        storeId,
                        name: normalizedName || 'Unnamed Item',
                        barcode: normalizedBarcode,
                        sku: normalizedSku,
                        category: normalizedCategory || 'Uncategorized',
                        vendor: normalizedVendor,
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
                if (!product.isConfirmed) {
                    const normalizedVendor = (item as any).vendor?.trim() || null;
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            barcode: product.barcode || normalizedBarcode,
                            sku: product.sku || normalizedSku,
                            category: product.category === 'Uncategorized' ? (normalizedCategory || product.category) : product.category,
                            vendor: product.vendor || normalizedVendor,
                            sellingPrice: product.sellingPrice === 0 ? price : product.sellingPrice,
                            importCount: { increment: 1 }
                        }
                    });
                } else {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { importCount: { increment: 1 } }
                    });
                }
            }

            validItems.push({ product, qty, price });
        }

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
