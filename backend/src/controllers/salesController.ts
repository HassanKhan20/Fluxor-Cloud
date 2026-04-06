import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import csv from 'csv-parser';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import Tesseract from 'tesseract.js';
import { getStoreId } from '../lib/storeContext';

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

// Column name mappings — very broad to catch any POS export
const COLUMN_MAPPINGS: Record<string, string[]> = {
    receiptId: ['receiptId', 'receipt', 'Receipt', 'Receipt ID', 'receipt_id', 'ReceiptID', 'Transaction ID', 'transaction_id', 'Order ID', 'order_id', 'Invoice', 'invoice', 'Ref', 'ref', 'Reference', 'Bill', 'bill', 'Check', 'check', 'Ticket', 'ticket'],
    date: ['date', 'Date', 'DateTime', 'datetime', 'Transaction Date', 'Sale Date', 'Time', 'Timestamp', 'timestamp', 'Created', 'created_at', 'order_date', 'Order Date', 'Sold On', 'sold_on', 'Purchase Date', 'Trans Date'],
    productName: ['productName', 'product', 'Product', 'Description', 'description', 'Item', 'item', 'Product Name', 'Item Name', 'item_name', 'product_name', 'name', 'Name', 'Menu Item', 'LineItem', 'Line Item', 'line_item', 'Article', 'article', 'Goods', 'goods', 'Product Description', 'Item Description', 'Desc'],
    barcode: ['barcode', 'Barcode', 'UPC', 'upc', 'Product Code', 'EAN', 'ean', 'GTIN', 'gtin', 'Bar Code', 'bar_code', 'Code'],
    sku: ['sku', 'SKU', 'Item Code', 'item_code', 'ItemCode', 'Product ID', 'product_id', 'Item Number', 'item_number', 'Item No', 'PLU', 'plu', 'Stock Code', 'Part Number', 'part_number', 'Product ID'],
    category: ['category', 'Category', 'Department', 'department', 'Type', 'type', 'Group', 'group', 'Class', 'class', 'Section', 'section', 'Family', 'family', 'Sub Category', 'subcategory'],
    quantity: ['quantity', 'Quantity', 'Qty', 'qty', 'Amount', 'Count', 'count', 'Units', 'units', 'Qty Sold', 'qty_sold', 'Qty.', 'No.', 'Pieces', 'pieces', 'Num', 'num', '#', 'Quantity In Stock', 'quantity_in_stock', 'Stock', 'stock', 'On Hand', 'on_hand', 'In Stock'],
    unitPrice: ['unitPrice', 'Unit Price', 'unit_price', 'Price', 'price', 'Unit Cost', 'Rate', 'rate', 'Sell Price', 'sell_price', 'Sale Price', 'sale_price', 'Each', 'each', 'Cost', 'cost', 'Retail', 'retail', 'MRP', 'mrp', 'Selling Price ($)', 'Selling Price', 'selling_price', 'Cost Price ($)', 'Cost Price', 'cost_price', 'Retail Price'],
    paymentMethod: ['paymentMethod', 'Payment Method', 'payment', 'Payment', 'Method', 'Payment Type', 'payment_type', 'Tender', 'tender', 'Pay Type', 'pay_type'],
    vendor: ['vendor', 'Vendor', 'Supplier', 'supplier', 'Brand', 'brand', 'Manufacturer', 'manufacturer', 'Distributor', 'distributor', 'Source', 'Maker']
};

// These are the only truly required fields
const REQUIRED_FIELDS = ['productName'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateImportHash(receiptId: string, date: string, items: string): string {
    return crypto.createHash('sha256').update(`${receiptId}|${date}|${items}`).digest('hex').substring(0, 32);
}

function cleanPrice(val: string): number {
    if (!val || val.trim() === '') return 0;
    let s = val.trim();
    const isNeg = s.startsWith('(') && s.endsWith(')');
    s = s.replace(/[()]/g, '');
    s = s.replace(/[$€£¥₹,\s]/g, '');
    // Handle European format: 1.234,56 → 1234.56
    if (s.includes(',') && s.indexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(s);
    if (isNaN(num)) return 0;
    return isNeg ? -Math.abs(num) : Math.abs(num);
}

function cleanQuantity(val: string): number {
    if (!val || val.trim() === '') return 1;
    const num = parseFloat(val.trim().replace(/[,\s]/g, ''));
    return isNaN(num) || num <= 0 ? 1 : Math.round(num * 100) / 100;
}

function parseDateTime(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;
    const trimmed = dateStr.trim();

    const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,  // MM/DD/YYYY HH:mm
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,                                     // MM/DD/YYYY
        /^(\d{4})-(\d{2})-(\d{2})/,                                             // YYYY-MM-DD
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,                                        // DD-MM-YYYY
    ];

    const parsed = new Date(trimmed);
    return !isNaN(parsed.getTime()) ? parsed : null;
}

function normalizeHeaders(headers: string[]): { mapping: Record<string, string>, missing: string[] } {
    const mapping: Record<string, string> = {};
    const foundFields: string[] = [];

    for (const [standardName, aliases] of Object.entries(COLUMN_MAPPINGS)) {
        for (const header of headers) {
            const trimmedHeader = header.trim().replace(/^["']|["']$/g, '');
            if (aliases.some(alias => alias.toLowerCase() === trimmedHeader.toLowerCase())) {
                mapping[trimmedHeader] = standardName;
                foundFields.push(standardName);
                break;
            }
        }
    }

    // If productName not found, try to guess — use the first text-looking column
    if (!foundFields.includes('productName')) {
        for (const header of headers) {
            const h = header.trim().toLowerCase();
            if (!Object.values(mapping).length || !mapping[header]) {
                // Skip obviously numeric/date columns
                if (!h.match(/^(id|#|no|num|total|tax|discount|subtotal|vat)/)) {
                    mapping[header] = 'productName';
                    foundFields.push('productName');
                    break;
                }
            }
        }
    }

    const missing = REQUIRED_FIELDS.filter(f => !foundFields.includes(f));
    return { mapping, missing };
}

// Auto-detect: if quantity/price columns not found, look for numeric columns
function autoDetectNumericColumns(headers: string[], sampleRows: any[]): Record<string, string> {
    const extra: Record<string, string> = {};
    if (sampleRows.length === 0) return extra;

    const numericCols: { header: string; avg: number; allInts: boolean }[] = [];

    for (const header of headers) {
        const values = sampleRows.map(r => r[header]).filter(v => v && v.trim());
        const nums = values.map(v => parseFloat(String(v).replace(/[$€£¥₹,\s]/g, ''))).filter(n => !isNaN(n));

        if (nums.length >= values.length * 0.5 && nums.length > 0) {
            const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
            const allInts = nums.every(n => Number.isInteger(n));
            numericCols.push({ header, avg, allInts });
        }
    }

    // Guess: column with small integers is likely quantity, column with decimals is likely price
    const qtyCol = numericCols.find(c => c.allInts && c.avg < 100 && c.avg > 0);
    const priceCol = numericCols.find(c => c !== qtyCol && c.avg > 0);

    if (qtyCol) extra[qtyCol.header] = 'quantity';
    if (priceCol) extra[priceCol.header] = 'unitPrice';

    return extra;
}

// ─── File type handlers ──────────────────────────────────────────────────────

async function parseCSV(filePath: string): Promise<{ headers: string[]; rows: any[] }> {
    const headers: string[] = [];
    const rows: any[] = [];

    await new Promise<void>((resolve) => {
        fs.createReadStream(filePath, { encoding: 'utf8' })
            .on('error', () => resolve())
            .pipe(csv())
            .on('headers', (h: string[]) => headers.push(...h))
            .on('data', (row: any) => rows.push(row))
            .on('end', () => resolve())
            .on('error', () => resolve());
    });

    return { headers, rows };
}

function parseExcel(filePath: string): { headers: string[]; rows: any[] } {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { headers: [], rows: [] };

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (jsonData.length === 0) return { headers: [], rows: [] };

    const headers = Object.keys(jsonData[0] as object);
    return { headers, rows: jsonData as any[] };
}

async function parseImageOrPdf(filePath: string): Promise<{ headers: string[]; rows: any[] }> {
    const result = await Tesseract.recognize(filePath, 'eng');
    const text = result.data.text;

    if (!text || text.trim().length < 10) {
        return { headers: [], rows: [] };
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return { headers: [], rows: [] };

    const parsedRows: any[] = [];
    let currentCategory = 'Uncategorized';

    // Skip lines — headers, footers, metadata, PDF internals
    const skipPatterns = /^(sales\s+summary|report|date|time|period|from|to|page|printed|generated|payment|tender|net\s+sales|gross\s+sales|total\s+sales|total\s+revenue|total\s+tax|total\s+discount|grand\s+total|cash|credit|debit|visa|master|amex|check|gift\s+card|refund|void|employee|server|terminal|register|table|guest|cover|dine.in|take.out|delivery|order\s+type|payment\s+method|tips?\b|gratuity|service\s+charge|opening|closing|balance|deposit|drawer|variance|over.short|comp|promo)/i;

    // Reject garbage strings — PDF internals, hex, control chars, binary
    function isGarbageName(name: string): boolean {
        if (!name || name.length < 2 || name.length > 100) return true;
        // Has PDF object markers
        if (/\d{5,}\s+\d{5}\s+[nf]/.test(name)) return true;
        // Has binary/control characters
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(name)) return true;
        // More than 30% non-alphanumeric (likely garbage)
        const nonAlpha = name.replace(/[a-zA-Z0-9\s\-'&.,/()]/g, '').length;
        if (nonAlpha / name.length > 0.3) return true;
        // Known PDF metadata
        if (/reportlab|generated|pdf\s*document|opensource|endobj|startxref|xref|trailer|stream/i.test(name)) return true;
        // All uppercase hex-like strings
        if (/^[0-9A-Fa-f\s]+$/.test(name) && name.length > 6) return true;
        return false;
    }

    // Category/section headers — lines that are just text, no numbers
    const categoryPattern = /^([A-Z][A-Za-z\s&\/\-]+)$/;

    for (const line of lines) {
        // Skip known non-data lines
        if (skipPatterns.test(line)) continue;
        if (line.length < 3) continue;

        // Detect section/category headers: "BEVERAGES", "Food Items", "Appetizers"
        const catMatch = line.match(categoryPattern);
        if (catMatch && !line.match(/\d/)) {
            const candidate = catMatch[1].trim();
            // Must be 2+ chars, not a skip pattern, and look like a category
            if (candidate.length >= 2 && candidate.length <= 40) {
                currentCategory = candidate;
                continue;
            }
        }

        // Strategy 1: "Item Name    Qty    Amount" (3+ numbers at end)
        // e.g. "Cheeseburger    45    $562.50"  or  "Coca Cola 2L  120  3.99  478.80"
        const fullMatch = line.match(/^(.+?)\s{2,}(\d+(?:\.\d+)?)\s+\$?([\d,]+(?:\.\d{2})?)\s*(?:\$?[\d,]+(?:\.\d{2})?)?$/);
        if (fullMatch) {
            const [, name, qty, price] = fullMatch;
            const cleanName = name.replace(/[.\-_]{3,}/g, '').trim();
            if (isGarbageName(cleanName)) continue;
            if (skipPatterns.test(cleanName)) continue;
            parsedRows.push({
                productName: cleanName,
                quantity: qty,
                unitPrice: price.replace(/,/g, ''),
                category: currentCategory
            });
            continue;
        }

        // Strategy 2: "Item Name    $Amount" (summary line — qty=1, amount is total)
        // e.g. "Draft Beer    $1,245.00"
        const summaryMatch = line.match(/^(.+?)\s{2,}\$?([\d,]+\.\d{2})$/);
        if (summaryMatch) {
            const [, name, amount] = summaryMatch;
            const cleanName = name.replace(/[.\-_]{3,}/g, '').trim();
            const amountNum = parseFloat(amount.replace(/,/g, ''));
            if (isGarbageName(cleanName) || amountNum <= 0) continue;
            if (skipPatterns.test(cleanName)) continue;
            parsedRows.push({
                productName: cleanName,
                quantity: '1',
                unitPrice: amount.replace(/,/g, ''),
                category: currentCategory
            });
            continue;
        }

        // Strategy 3: "Item Name  Qty  UnitPrice  Total" (4 columns)
        // e.g. "Wings 12pc    8    12.99    103.92"
        const fourColMatch = line.match(/^(.+?)\s{2,}(\d+)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})$/);
        if (fourColMatch) {
            const [, name, qty, unitPrice] = fourColMatch;
            const cleanName = name.replace(/[.\-_]{3,}/g, '').trim();
            if (isGarbageName(cleanName)) continue;
            if (skipPatterns.test(cleanName)) continue;
            parsedRows.push({
                productName: cleanName,
                quantity: qty,
                unitPrice: unitPrice.replace(/,/g, ''),
                category: currentCategory
            });
            continue;
        }

        // Strategy 4: "Qty x Item Name  Price" — receipt style
        // e.g. "2 x Large Coffee  $8.50"
        const qtyFirstMatch = line.match(/^(\d+)\s*[xX×]\s+(.+?)\s+\$?([\d,]+\.\d{2})$/);
        if (qtyFirstMatch) {
            const [, qty, name, price] = qtyFirstMatch;
            const cleanName = name.trim();
            if (cleanName.length < 2) continue;
            parsedRows.push({
                productName: cleanName,
                quantity: qty,
                unitPrice: price.replace(/,/g, ''),
                category: currentCategory
            });
            continue;
        }

        // Strategy 5: Simple "Name  Number" — could be qty sold or revenue
        const simpleMatch = line.match(/^(.+?)\s{2,}(\d+)$/);
        if (simpleMatch) {
            const [, name, num] = simpleMatch;
            const cleanName = name.replace(/[.\-_]{3,}/g, '').trim();
            const numVal = parseInt(num);
            if (cleanName.length < 2 || numVal <= 0) continue;
            if (skipPatterns.test(cleanName)) continue;
            // If number looks like a count (< 1000), treat as quantity sold at unknown price
            if (numVal < 1000) {
                parsedRows.push({
                    productName: cleanName,
                    quantity: num,
                    unitPrice: '0',
                    category: currentCategory
                });
            }
        }
    }

    if (parsedRows.length > 0) {
        return {
            headers: ['productName', 'quantity', 'unitPrice', 'category'],
            rows: parsedRows
        };
    }

    return { headers: [], rows: [] };
}

// ─── Main: detect file type and parse ────────────────────────────────────────

async function parseAnyFile(filePath: string, originalName: string): Promise<{ headers: string[]; rows: any[]; fileType: string }> {
    const ext = (originalName.toLowerCase().split('.').pop() || '').trim();

    // Excel files
    if (['xls', 'xlsx'].includes(ext)) {
        try {
            const result = parseExcel(filePath);
            return { ...result, fileType: 'excel' };
        } catch {
            return { headers: [], rows: [], fileType: 'excel' };
        }
    }

    // PDF — try Excel first, then OCR (skip raw text extraction — produces garbage)
    if (ext === 'pdf') {
        try {
            const excelResult = parseExcel(filePath);
            if (excelResult.rows.length > 0) return { ...excelResult, fileType: 'excel' };
        } catch { /* not excel */ }

        try {
            const result = await parseImageOrPdf(filePath);
            return { ...result, fileType: 'ocr' };
        } catch {
            return { headers: [], rows: [], fileType: 'pdf' };
        }
    }

    // Images — OCR
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif'].includes(ext)) {
        try {
            const result = await parseImageOrPdf(filePath);
            return { ...result, fileType: 'ocr' };
        } catch {
            return { headers: [], rows: [], fileType: 'ocr' };
        }
    }

    // CSV / TSV / TXT — try CSV parser first
    try {
        // Check if file is readable text
        const content = fs.readFileSync(filePath, 'utf8');
        const firstLines = content.split('\n').slice(0, 3).join('\n');

        // If it looks like CSV (has commas/tabs/pipes)
        if (firstLines.includes(',') || firstLines.includes('\t') || firstLines.includes('|')) {
            const result = await parseCSV(filePath);
            if (result.rows.length > 0) return { ...result, fileType: 'csv' };
        }

        // Try Excel anyway (some .txt/.csv are actually Excel)
        try {
            const result = parseExcel(filePath);
            if (result.rows.length > 0) return { ...result, fileType: 'excel' };
        } catch { /* not excel */ }

        // Last resort: try OCR
        try {
            const result = await parseImageOrPdf(filePath);
            if (result.rows.length > 0) return { ...result, fileType: 'ocr' };
        } catch { /* not an image */ }

        return { headers: [], rows: [], fileType: 'unknown' };
    } catch {
        return { headers: [], rows: [], fileType: 'unknown' };
    }
}

// ─── Normalize a raw row into a SaleRow ──────────────────────────────────────

function normalizeRow(row: any, headerMapping: Record<string, string>): SaleRow | null {
    const normalized: any = {};

    for (const [csvColumn, standardName] of Object.entries(headerMapping)) {
        normalized[standardName] = String(row[csvColumn] ?? '').trim();
    }

    // Also grab unmapped fields directly if keys match standard names
    for (const key of Object.keys(row)) {
        const lower = key.toLowerCase().trim();
        if (lower === 'productname' || lower === 'product' || lower === 'item' || lower === 'description' || lower === 'name') {
            if (!normalized.productName) normalized.productName = String(row[key]).trim();
        }
        if (lower === 'quantity' || lower === 'qty') {
            if (!normalized.quantity) normalized.quantity = String(row[key]).trim();
        }
        if (lower === 'price' || lower === 'unitprice' || lower === 'unit price' || lower === 'amount' || lower === 'total') {
            if (!normalized.unitPrice) normalized.unitPrice = String(row[key]).trim();
        }
    }

    // Must have a valid product name — reject garbage
    if (!normalized.productName || normalized.productName === '' || normalized.productName === 'undefined') {
        return null;
    }
    // Reject PDF internals, hex strings, binary garbage
    const pn = normalized.productName;
    if (/\d{5,}\s+\d{5}\s+[nf]/.test(pn)) return null;
    if (/reportlab|generated|pdf\s*document|opensource|endobj|startxref|xref/i.test(pn)) return null;
    const nonAlpha = pn.replace(/[a-zA-Z0-9\s\-'&.,/()]/g, '').length;
    if (pn.length > 3 && nonAlpha / pn.length > 0.3) return null;

    // Clean quantity and price
    normalized.quantity = String(cleanQuantity(normalized.quantity || '1'));
    normalized.unitPrice = String(cleanPrice(normalized.unitPrice || '0'));

    // Fill defaults
    normalized.receiptId = normalized.receiptId || '';
    normalized.date = normalized.date || '';
    normalized.barcode = normalized.barcode || '';
    normalized.sku = normalized.sku || '';
    normalized.category = normalized.category || '';
    normalized.paymentMethod = normalized.paymentMethod || '';
    normalized.vendor = normalized.vendor || '';

    return normalized as SaleRow;
}

// ─── Validate CSV endpoint ───────────────────────────────────────────────────

export const validateSalesCsv = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded', errors: [] });
        }

        const { headers, rows, fileType } = await parseAnyFile(req.file.path, req.file.originalname);

        // Cleanup
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        if (rows.length === 0) {
            return res.json({
                success: false,
                message: fileType === 'ocr'
                    ? 'Could not read any sales data from this image/PDF. Try a clearer photo or export as CSV from your POS system.'
                    : fileType === 'unknown'
                        ? 'Could not read this file. Please upload a CSV, Excel file, or a clear photo/PDF of your sales report.'
                        : 'The file appears to be empty. Make sure it contains sales data.',
                errors: [],
                totalRows: 0,
                validRows: 0
            });
        }

        // Map columns
        let headerMapping = headers.length > 0 ? normalizeHeaders(headers).mapping : {};

        // Auto-detect numeric columns if quantity/price not found
        const mappedFields = Object.values(headerMapping);
        if (!mappedFields.includes('quantity') || !mappedFields.includes('unitPrice')) {
            const extra = autoDetectNumericColumns(headers, rows.slice(0, 10));
            for (const [h, field] of Object.entries(extra)) {
                if (!mappedFields.includes(field)) {
                    headerMapping[h] = field;
                }
            }
        }

        // Normalize all rows
        const validRows: SaleRow[] = [];
        const errors: ValidationError[] = [];

        for (let i = 0; i < rows.length; i++) {
            const normalized = normalizeRow(rows[i], headerMapping);
            if (normalized) {
                validRows.push(normalized);
            } else {
                errors.push({ row: i + 1, field: 'productName', value: '', message: 'No product name found in this row' });
            }
        }

        res.json({
            success: validRows.length > 0,
            message: validRows.length > 0
                ? `${validRows.length} rows ready to import${errors.length > 0 ? ` (${errors.length} rows skipped)` : ''}`
                : 'No valid sales data found in the file',
            fileType,
            totalRows: rows.length,
            validRows: validRows.length,
            skippedRows: errors.length,
            errors: errors.slice(0, 10),
            preview: validRows.slice(0, 5)
        });
    } catch (error: any) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'Failed to process file. It may be corrupted or in an unsupported format.', errors: [] });
    }
};

// ─── Upload and process endpoint ─────────────────────────────────────────────

export const uploadSalesCsv = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { headers, rows, fileType } = await parseAnyFile(req.file.path, req.file.originalname);

        if (rows.length === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: fileType === 'ocr'
                    ? 'Could not read sales data from this file. Try a clearer image or export as CSV.'
                    : 'No data found in the file. Make sure it contains sales data.'
            });
        }

        // Map columns
        let headerMapping = headers.length > 0 ? normalizeHeaders(headers).mapping : {};

        const mappedFields = Object.values(headerMapping);
        if (!mappedFields.includes('quantity') || !mappedFields.includes('unitPrice')) {
            const extra = autoDetectNumericColumns(headers, rows.slice(0, 10));
            for (const [h, field] of Object.entries(extra)) {
                if (!mappedFields.includes(field)) {
                    headerMapping[h] = field;
                }
            }
        }

        // Normalize rows — skip bad ones silently
        const validRows: SaleRow[] = [];
        let skippedCount = 0;

        for (const row of rows) {
            const normalized = normalizeRow(row, headerMapping);
            if (normalized) {
                validRows.push(normalized);
            } else {
                skippedCount++;
            }
        }

        if (validRows.length === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: `Found ${rows.length} rows but none had valid product names. Check your file format.`
            });
        }

        const importResult = await processSalesData(storeId, validRows);

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: 'Sales data imported successfully',
            fileType,
            imported: importResult.imported,
            skipped: importResult.skipped + skippedCount,
            duplicates: importResult.duplicates,
            totalRows: rows.length,
            validRows: validRows.length
        });
    } catch (error: any) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'Error processing file. Please check the format and try again.' });
    }
};

// ─── Export sales as CSV ─────────────────────────────────────────────────────

export const exportSales = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const sales = await prisma.sale.findMany({
            where: { storeId },
            orderBy: { dateTime: 'desc' },
            take: 5000,
            include: {
                items: {
                    include: { product: { select: { name: true, barcode: true, sku: true, category: true } } }
                }
            }
        });

        const headers = 'Date,Receipt ID,Product,Barcode,SKU,Category,Quantity,Unit Price,Line Total,Source\n';
        const rows = sales.flatMap(sale =>
            sale.items.map(item => [
                new Date(sale.dateTime).toISOString().split('T')[0],
                sale.importHash?.substring(0, 8) || sale.id.substring(0, 8),
                `"${(item.product.name || '').replace(/"/g, '""')}"`,
                item.product.barcode || '',
                item.product.sku || '',
                `"${(item.product.category || '').replace(/"/g, '""')}"`,
                item.quantity,
                item.unitPrice.toFixed(2),
                item.lineTotal.toFixed(2),
                sale.source
            ].join(','))
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_export.csv');
        res.send(headers + rows);
    } catch (error) {
        res.status(500).json({ message: 'Error exporting sales' });
    }
};

// ─── Process sales data into DB ──────────────────────────────────────────────

async function processSalesData(storeId: string, rows: SaleRow[]): Promise<{ imported: number; skipped: number; duplicates: number }> {
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;

    const salesMap = new Map<string, SaleRow[]>();
    for (const row of rows) {
        const key = row.receiptId || `GEN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        if (!salesMap.has(key)) salesMap.set(key, []);
        salesMap.get(key)?.push(row);
    }

    for (const [receiptId, items] of salesMap) {
        const itemsString = items.map(i => `${i.productName}|${i.quantity}|${i.unitPrice}`).sort().join(';');
        const importHash = generateImportHash(receiptId, items[0].date || '', itemsString);

        const existingSale = await prisma.sale.findFirst({ where: { storeId, importHash } });
        if (existingSale) { duplicates++; continue; }

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
            const normalizedVendor = item.vendor?.trim() || null;

            let product = null;

            if (normalizedBarcode) {
                product = await prisma.product.findFirst({ where: { storeId, barcode: normalizedBarcode } });
            }
            if (!product && normalizedSku) {
                product = await prisma.product.findFirst({ where: { storeId, sku: normalizedSku } });
            }
            if (!product && normalizedName) {
                const existing = await prisma.product.findMany({ where: { storeId } });
                product = existing.find(p => p.name.toLowerCase().trim() === normalizedName.toLowerCase());
            }

            if (!product) {
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

        const date = parseDateTime(items[0].date) || new Date();

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
