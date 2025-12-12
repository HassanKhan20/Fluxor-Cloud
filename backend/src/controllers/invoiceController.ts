import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Helper (reused)
const getStoreId = async (req: Request): Promise<string | null> => {
    // @ts-ignore
    const userId = req.user?.userId;
    if (!userId) return null;
    const membership = await prisma.storeMembership.findFirst({ where: { userId } });
    return membership?.storeId || null;
};

// Mock OCR Service
const mockOcrService = async (fileBuffer: Buffer) => {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate gathered findings
    return {
        supplierName: "Metro Suppliers Ltd.",
        invoiceDate: new Date(),
        totalAmount: 1540.50,
        items: [
            { description: "Coca Cola 330ml 24pk", quantity: 10, unitPrice: 12.50, lineTotal: 125.00 },
            { description: "Lays Chips Salted 150g", quantity: 50, unitPrice: 1.20, lineTotal: 60.00 },
            { description: "Generic Milk 1L", quantity: 20, unitPrice: 0.90, lineTotal: 18.00 },
        ]
    };
};

export const uploadInvoice = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // 1. Create Invoice Record Initial State
        const invoice = await prisma.invoice.create({
            data: {
                storeId,
                status: 'PROCESSING',
                fileUrl: req.file.path // In real app, upload to S3 and save URL
            }
        });

        // 2. Trigger Mock OCR
        // In production, this might be a background job. For MVP, we await it or just kick it off.
        // Let's await it to return immediate feedback for demo.
        const ocrResult = await mockOcrService(req.file.buffer);

        // 3. Update Invoice with Results
        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                status: 'PARSED',
                supplierName: ocrResult.supplierName,
                invoiceDate: ocrResult.invoiceDate,
                totalAmount: ocrResult.totalAmount,
                parsedSummary: JSON.stringify(ocrResult),
                items: {
                    create: ocrResult.items.map(item => ({
                        rawDescription: item.description,
                        quantity: item.quantity,
                        unitCost: item.unitPrice,
                        lineTotal: item.lineTotal,
                        matchedProductConfidence: 0.0 // No linking yet
                    }))
                }
            },
            include: { items: true }
        });

        res.json(updatedInvoice);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing invoice' });
    }
};

export const getInvoices = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const invoices = await prisma.invoice.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { items: true } } }
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoices' });
    }
};
