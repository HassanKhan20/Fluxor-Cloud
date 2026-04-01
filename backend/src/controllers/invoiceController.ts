import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import {
    processInvoice,
    applyInventoryUpdates,
    InvoiceParseResult
} from '../services/invoiceAIService';

import { getStoreId } from '../lib/storeContext';

function cleanupFile(filePath?: string) {
    if (!filePath) return;
    fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error('[Invoice] Failed to delete temp file:', filePath, err);
        }
    });
}

// Upload and process invoice with AI
export const uploadInvoice = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // 1. Create Invoice Record — store the file path so reprocessing can find it
        const invoice = await prisma.invoice.create({
            data: {
                storeId,
                status: 'PROCESSING',
                fileUrl: req.file.path   // Stable filename from diskStorage (not a random temp name)
            }
        });

        console.log(`[Invoice] Created invoice ${invoice.id}, processing with AI...`);

        // 2. Process with AI
        let parseResult: InvoiceParseResult;
        try {
            parseResult = await processInvoice(req.file.path, storeId);
        } catch (error) {
            console.error('[Invoice] AI processing failed:', error);
            cleanupFile(req.file.path);
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: 'ERROR' }
            });
            return res.status(500).json({
                message: 'Invoice processing failed',
                invoiceId: invoice.id
            });
        }

        // File is kept on disk so reprocessing can find it (fileUrl points to it)

        // 3. Update Invoice with Results
        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                status: parseResult.needs_review ? 'NEEDS_REVIEW' : 'PARSED',
                supplierName: parseResult.invoice_metadata.supplier_name,
                invoiceDate: parseResult.invoice_metadata.invoice_date
                    ? new Date(parseResult.invoice_metadata.invoice_date)
                    : null,
                totalAmount: parseResult.invoice_metadata.total,
                parsedSummary: JSON.stringify({
                    metadata: parseResult.invoice_metadata,
                    confidence: parseResult.confidence,
                    alerts_count: parseResult.pricing_alerts.length,
                    anomalies_count: parseResult.anomalies.length,
                    insights_count: parseResult.business_insights.length
                }),
                items: {
                    create: parseResult.line_items.map(item => ({
                        rawDescription: item.description,
                        quantity: item.quantity,
                        unitCost: item.unit_cost,
                        lineTotal: item.line_total,
                        productId: item.matched_product_id,
                        matchedProductConfidence: item.confidence
                    }))
                }
            },
            include: { items: true }
        });

        // Return full parse result with invoice
        res.json({
            invoice: updatedInvoice,
            parse_result: parseResult
        });

    } catch (error) {
        console.error('[Invoice] Error:', error);
        res.status(500).json({ message: 'Error processing invoice' });
    }
};

// Get all invoices
export const getInvoices = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where: { storeId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    items: {
                        include: { product: { select: { id: true, name: true } } }
                    },
                    _count: { select: { items: true } }
                }
            }),
            prisma.invoice.count({ where: { storeId } })
        ]);

        res.json({ invoices, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoices' });
    }
};

// Get single invoice with full details
export const getInvoiceDetails = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;

        const invoice = await prisma.invoice.findFirst({
            where: { id, storeId },
            include: {
                items: {
                    include: { product: { select: { id: true, name: true, sellingPrice: true, costPrice: true } } }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoice' });
    }
};

// Confirm invoice and apply inventory updates
export const confirmInvoice = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;
        const { line_items } = req.body; // Allow manual overrides

        const invoice = await prisma.invoice.findFirst({
            where: { id, storeId },
            include: { items: true }
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        if (invoice.status === 'CONFIRMED') {
            return res.status(400).json({ message: 'Invoice already confirmed' });
        }

        // Build line items from invoice items or overrides
        const itemsToProcess = line_items || invoice.items.map(item => ({
            matched_product_id: item.productId,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            line_total: item.lineTotal,
            description: item.rawDescription,
            confidence: item.matchedProductConfidence
        }));

        // Apply inventory updates
        const updates = await applyInventoryUpdates(id, itemsToProcess, storeId);

        // Mark invoice as confirmed
        await prisma.invoice.update({
            where: { id },
            data: { status: 'CONFIRMED' }
        });

        res.json({
            message: 'Invoice confirmed and inventory updated',
            inventory_updates: updates
        });

    } catch (error) {
        console.error('[Invoice] Confirm error:', error);
        res.status(500).json({ message: 'Error confirming invoice' });
    }
};

// Reprocess invoice with AI
export const reprocessInvoice = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { id } = req.params;

        const invoice = await prisma.invoice.findFirst({
            where: { id, storeId }
        });

        if (!invoice || !invoice.fileUrl) {
            return res.status(404).json({ message: 'Invoice not found or no file' });
        }

        // Delete existing items
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

        // Update status
        await prisma.invoice.update({
            where: { id },
            data: { status: 'PROCESSING' }
        });

        // Reprocess
        const parseResult = await processInvoice(invoice.fileUrl, storeId);

        // Update with new results
        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                status: parseResult.needs_review ? 'NEEDS_REVIEW' : 'PARSED',
                supplierName: parseResult.invoice_metadata.supplier_name,
                invoiceDate: parseResult.invoice_metadata.invoice_date
                    ? new Date(parseResult.invoice_metadata.invoice_date)
                    : null,
                totalAmount: parseResult.invoice_metadata.total,
                parsedSummary: JSON.stringify({
                    metadata: parseResult.invoice_metadata,
                    confidence: parseResult.confidence
                }),
                items: {
                    create: parseResult.line_items.map(item => ({
                        rawDescription: item.description,
                        quantity: item.quantity,
                        unitCost: item.unit_cost,
                        lineTotal: item.line_total,
                        productId: item.matched_product_id,
                        matchedProductConfidence: item.confidence
                    }))
                }
            },
            include: { items: true }
        });

        res.json({
            invoice: updatedInvoice,
            parse_result: parseResult
        });

    } catch (error) {
        console.error('[Invoice] Reprocess error:', error);
        res.status(500).json({ message: 'Error reprocessing invoice' });
    }
};
