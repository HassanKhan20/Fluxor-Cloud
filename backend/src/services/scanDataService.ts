// Tobacco scan-data export.
//
// Generates the weekly file format that Altria's Digital Trade Program (DTP /
// MSAi via Circana) and RJR's RMSC RSD program expect from independent retailers.
// These programs pay per-week rebates to retailers who submit clean data;
// Square/Clover/Lightspeed do not produce these files at all, and PDI/Petrosoft
// gate the feature behind sales — making this a concrete dollar-value wedge.
//
// Two formats are produced:
//   Altria DTP — comma-delimited, with header
//   RJR RMSC  — pipe-delimited, with header (per Skupos integration docs)
//
// We classify a Product as tobacco when its `category` matches the regex below
// or its name/brand suggests it. Operators can refine this by tagging products
// with explicit categories ("CIGARETTES", "OTP", "CIGARS", "SMOKELESS").

import { prisma } from '../lib/prisma';

const TOBACCO_CATEGORY_RE = /\b(cigarette|cigar|tobacco|smokeless|vape|e-?cig|otp|moist|snuff|chew)\b/i;

export type ScanDataProgram = 'altria' | 'rjr';

export interface ScanDataExportRow {
    transactionDate: string;   // YYYY-MM-DD
    transactionTime: string;   // HH:MM:SS
    upc: string;
    productDescription: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    storeIdentifier: string;
    transactionId: string;
    promotionId: string;       // empty if no promo
    manufacturer: string;
}

export interface ScanDataExportResult {
    program: ScanDataProgram;
    weekStart: string;          // YYYY-MM-DD
    weekEnd: string;            // YYYY-MM-DD
    rowCount: number;
    fileBody: string;           // The actual CSV/pipe-delimited content
    fileName: string;           // Suggested download filename
    contentType: string;
    skippedReasons: { productId: string; productName: string; reason: string }[];
}

function isTobaccoProduct(p: { category: string | null; name: string; brand: string | null }): boolean {
    if (p.category && TOBACCO_CATEGORY_RE.test(p.category)) return true;
    if (TOBACCO_CATEGORY_RE.test(p.name)) return true;
    if (p.brand && TOBACCO_CATEGORY_RE.test(p.brand)) return true;
    return false;
}

function csvEscape(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function pipeEscape(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[|\r\n]/g, ' ');
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(d: Date): string {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function formatTime(d: Date): string {
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

export async function buildScanDataExport(
    storeId: string,
    program: ScanDataProgram,
    weekStart: Date,
    weekEnd: Date
): Promise<ScanDataExportResult> {
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, name: true }
    });
    if (!store) throw new Error('Store not found');

    const saleItems = await prisma.saleItem.findMany({
        where: {
            sale: {
                storeId,
                dateTime: { gte: weekStart, lte: weekEnd }
            }
        },
        include: {
            sale: { select: { id: true, dateTime: true } },
            product: { select: { id: true, name: true, brand: true, vendor: true, category: true, barcode: true, sku: true } }
        }
    });

    const skipped: ScanDataExportResult['skippedReasons'] = [];
    const rows: ScanDataExportRow[] = [];

    for (const item of saleItems) {
        if (!isTobaccoProduct(item.product)) continue;
        if (!item.product.barcode) {
            skipped.push({
                productId: item.product.id,
                productName: item.product.name,
                reason: 'missing UPC/barcode (required for scan-data submission)'
            });
            continue;
        }
        const t = new Date(item.sale.dateTime);
        rows.push({
            transactionDate: formatDate(t),
            transactionTime: formatTime(t),
            upc: item.product.barcode,
            productDescription: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.lineTotal,
            storeIdentifier: store.id,
            transactionId: item.sale.id,
            promotionId: '',
            manufacturer: item.product.brand || item.product.vendor || ''
        });
    }

    const startStr = formatDate(weekStart);
    const endStr = formatDate(weekEnd);

    let fileBody: string;
    let fileName: string;
    let contentType: string;

    if (program === 'altria') {
        // Altria DTP CSV — comma-delimited with header. Field order matches the
        // documented MSAi sale-detail schema; the program rejects files where
        // UPC is missing or the date format is not YYYY-MM-DD.
        const header = [
            'transaction_date', 'transaction_time', 'upc', 'product_description',
            'quantity', 'unit_price', 'total_amount', 'store_id',
            'transaction_id', 'promotion_id', 'manufacturer'
        ].join(',');
        const body = rows.map(r => [
            r.transactionDate, r.transactionTime, r.upc, csvEscape(r.productDescription),
            r.quantity, r.unitPrice.toFixed(2), r.totalAmount.toFixed(2), r.storeIdentifier,
            r.transactionId, r.promotionId, csvEscape(r.manufacturer)
        ].join(',')).join('\n');
        fileBody = `${header}\n${body}`;
        fileName = `altria-dtp-${store.id.slice(0, 8)}-${startStr}.csv`;
        contentType = 'text/csv';
    } else {
        // RJR RMSC pipe-delimited — Skupos's published preferred format for
        // weekly RJR scan-data submission ("pipe-delimited with header").
        const header = [
            'TransactionDate', 'TransactionTime', 'UPC', 'Description',
            'Quantity', 'UnitPrice', 'TotalAmount', 'StoreID',
            'TransactionID', 'PromotionID', 'Manufacturer'
        ].join('|');
        const body = rows.map(r => [
            r.transactionDate, r.transactionTime, r.upc, pipeEscape(r.productDescription),
            r.quantity, r.unitPrice.toFixed(2), r.totalAmount.toFixed(2), r.storeIdentifier,
            r.transactionId, r.promotionId, pipeEscape(r.manufacturer)
        ].join('|')).join('\n');
        fileBody = `${header}\n${body}`;
        fileName = `rjr-rmsc-${store.id.slice(0, 8)}-${startStr}.txt`;
        contentType = 'text/plain';
    }

    return {
        program,
        weekStart: startStr,
        weekEnd: endStr,
        rowCount: rows.length,
        fileBody,
        fileName,
        contentType,
        skippedReasons: skipped
    };
}

// Quick preview for the UI: how many tobacco rows would the export include,
// and how many products are missing a UPC (which blocks submission).
export async function previewScanDataExport(
    storeId: string,
    weekStart: Date,
    weekEnd: Date
): Promise<{
    eligibleRows: number;
    missingUpcCount: number;
    missingUpcProducts: { id: string; name: string }[];
    distinctTobaccoSkus: number;
}> {
    const saleItems = await prisma.saleItem.findMany({
        where: {
            sale: {
                storeId,
                dateTime: { gte: weekStart, lte: weekEnd }
            }
        },
        include: {
            product: { select: { id: true, name: true, brand: true, vendor: true, category: true, barcode: true } }
        }
    });

    const tobaccoItems = saleItems.filter(i => isTobaccoProduct(i.product));
    const eligibleRows = tobaccoItems.filter(i => i.product.barcode).length;
    const missingUpc = new Map<string, { id: string; name: string }>();
    for (const i of tobaccoItems) {
        if (!i.product.barcode) {
            missingUpc.set(i.product.id, { id: i.product.id, name: i.product.name });
        }
    }
    const distinct = new Set(tobaccoItems.map(i => i.product.id));

    return {
        eligibleRows,
        missingUpcCount: missingUpc.size,
        missingUpcProducts: Array.from(missingUpc.values()),
        distinctTobaccoSkus: distinct.size
    };
}
