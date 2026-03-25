import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';

interface VendorScorecard {
    vendorName: string;
    productCount: number;
    revenue: number;
    profit: number;
    marginPercent: number;
    inventoryDays: number;
    wasteContribution: number;
    overallScore: number;
    rating: 'green' | 'yellow' | 'red';
    trend: 'up' | 'down' | 'stable';
}

// Get all vendors with scorecards
export const getVendors = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

        // Get all products grouped by vendor with current period sales
        const products = await prisma.product.findMany({
            where: { storeId, isActive: true, vendor: { not: null } },
            include: {
                inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
                saleItems: {
                    include: { sale: { select: { dateTime: true } } },
                    where: { sale: { dateTime: { gte: sixtyDaysAgo } } }
                }
            }
        });

        // Group by vendor
        const vendorMap = new Map<string, typeof products>();
        for (const product of products) {
            const vendor = product.vendor || 'Unknown';
            if (!vendorMap.has(vendor)) vendorMap.set(vendor, []);
            vendorMap.get(vendor)!.push(product);
        }

        // Calculate total waste for percentage calculation
        let totalWaste = 0;
        const vendorWaste = new Map<string, number>();

        for (const [vendor, vendorProducts] of vendorMap) {
            let waste = 0;
            for (const product of vendorProducts) {
                const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
                const recentSales = product.saleItems.filter(si => new Date(si.sale.dateTime) >= thirtyDaysAgo);
                const totalSold = recentSales.reduce((sum, item) => sum + item.quantity, 0);
                const dailySalesRate = totalSold / 30;
                const daysOfStock = dailySalesRate > 0 ? currentStock / dailySalesRate : 999;

                if (totalSold === 0 && currentStock > 0) {
                    waste += currentStock * product.costPrice;
                } else if (daysOfStock > 60 && currentStock > 5) {
                    const excessDays = daysOfStock - 30;
                    const excessUnits = Math.floor(excessDays * dailySalesRate);
                    waste += excessUnits * product.costPrice * 0.3;
                }
            }
            vendorWaste.set(vendor, waste);
            totalWaste += waste;
        }

        // Build scorecards
        const scorecards: VendorScorecard[] = [];

        for (const [vendor, vendorProducts] of vendorMap) {
            let revenueThisPeriod = 0;
            let revenuePriorPeriod = 0;
            let cost = 0;
            let totalInventoryValue = 0;
            let dailySalesValue = 0;

            for (const product of vendorProducts) {
                const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;

                const thisMonthItems = product.saleItems.filter(si => new Date(si.sale.dateTime) >= thirtyDaysAgo);
                const priorMonthItems = product.saleItems.filter(si => {
                    const d = new Date(si.sale.dateTime);
                    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
                });

                const productRevenueThis = thisMonthItems.reduce((sum, item) => sum + item.lineTotal, 0);
                const productRevenuePrior = priorMonthItems.reduce((sum, item) => sum + item.lineTotal, 0);
                const productCost = thisMonthItems.reduce((sum, item) => sum + (item.quantity * product.costPrice), 0);

                revenueThisPeriod += productRevenueThis;
                revenuePriorPeriod += productRevenuePrior;
                cost += productCost;
                totalInventoryValue += currentStock * product.costPrice;
                dailySalesValue += productRevenueThis / 30;
            }

            const profit = revenueThisPeriod - cost;
            const marginPercent = revenueThisPeriod > 0 ? (profit / revenueThisPeriod) * 100 : 0;
            const inventoryDays = dailySalesValue > 0 ? totalInventoryValue / dailySalesValue : 999;
            const wasteContribution = totalWaste > 0 ? ((vendorWaste.get(vendor) || 0) / totalWaste) * 100 : 0;

            // Score calculation
            const marginScore = Math.min(marginPercent * 2, 40);
            const inventoryScore = Math.max(0, 30 - inventoryDays / 2);
            const wasteScore = Math.max(0, 30 - wasteContribution);
            const overallScore = Math.round(marginScore + inventoryScore + wasteScore);

            let rating: 'green' | 'yellow' | 'red' = 'yellow';
            if (overallScore >= 70) rating = 'green';
            else if (overallScore < 40) rating = 'red';

            // Calculate trend by comparing this month vs prior month revenue
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (revenuePriorPeriod > 0) {
                const changePercent = ((revenueThisPeriod - revenuePriorPeriod) / revenuePriorPeriod) * 100;
                if (changePercent > 5) trend = 'up';
                else if (changePercent < -5) trend = 'down';
            }

            scorecards.push({
                vendorName: vendor,
                productCount: vendorProducts.length,
                revenue: Math.round(revenueThisPeriod * 100) / 100,
                profit: Math.round(profit * 100) / 100,
                marginPercent: Math.round(marginPercent * 10) / 10,
                inventoryDays: Math.round(inventoryDays),
                wasteContribution: Math.round(wasteContribution * 10) / 10,
                overallScore,
                rating,
                trend
            });
        }

        scorecards.sort((a, b) => b.overallScore - a.overallScore);
        res.json(scorecards);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};

// Get products for a specific vendor
export const getVendorProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { vendorName } = req.params;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const products = await prisma.product.findMany({
            where: { storeId, vendor: vendorName, isActive: true },
            include: {
                inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
                saleItems: {
                    where: { sale: { dateTime: { gte: thirtyDaysAgo } } }
                }
            }
        });

        const enrichedProducts = products.map(product => {
            const currentStock = product.inventorySnapshots[0]?.quantityOnHand ?? product.initialStock ?? 0;
            const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
            const revenue = product.saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
            const margin = product.sellingPrice > 0
                ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100
                : 0;

            return {
                id: product.id,
                name: product.name,
                category: product.category,
                costPrice: product.costPrice,
                sellingPrice: product.sellingPrice,
                currentStock,
                totalSold,
                revenue: Math.round(revenue * 100) / 100,
                margin: Math.round(margin * 10) / 10
            };
        });

        res.json(enrichedProducts);
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        res.status(500).json({ error: 'Failed to fetch vendor products' });
    }
};

// Compare two or more vendors side by side
export const compareVendors = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const { vendors } = req.query;
        if (!vendors || typeof vendors !== 'string') {
            return res.status(400).json({ error: 'Please provide vendor names to compare' });
        }

        const vendorNames = vendors.split(',').map(v => v.trim());
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const products = await prisma.product.findMany({
            where: { storeId, isActive: true, vendor: { in: vendorNames } },
            include: {
                inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
                saleItems: {
                    where: { sale: { dateTime: { gte: thirtyDaysAgo } } }
                }
            }
        });

        const comparison = vendorNames
            .map(vendorName => {
                const vendorProducts = products.filter(p => p.vendor === vendorName);
                if (vendorProducts.length === 0) return null;

                let revenue = 0;
                let cost = 0;
                for (const product of vendorProducts) {
                    revenue += product.saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
                    cost += product.saleItems.reduce((sum, item) => sum + (item.quantity * product.costPrice), 0);
                }

                const profit = revenue - cost;
                const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

                return {
                    vendorName,
                    productCount: vendorProducts.length,
                    revenue: Math.round(revenue * 100) / 100,
                    profit: Math.round(profit * 100) / 100,
                    marginPercent: Math.round(marginPercent * 10) / 10
                };
            })
            .filter(Boolean);

        res.json(comparison);
    } catch (error) {
        console.error('Error comparing vendors:', error);
        res.status(500).json({ error: 'Failed to compare vendors' });
    }
};
