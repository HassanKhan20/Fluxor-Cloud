import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';

// ── STAFF CRUD ──────────────────────────────────────────────

export const getStaff = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const staff = await prisma.staff.findMany({
            where: { storeId, isActive: true },
            include: {
                shifts: { orderBy: { startTime: 'desc' }, take: 5 }
            },
            orderBy: { name: 'asc' }
        });
        res.json(staff);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch staff' }); }
};

export const createStaff = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { name, role, phone, email, hireDate } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const staff = await prisma.staff.create({
            data: { storeId, name, role: role || 'CASHIER', phone, email, hireDate: hireDate ? new Date(hireDate) : null }
        });
        res.status(201).json(staff);
    } catch (e) { res.status(500).json({ message: 'Failed to create staff' }); }
};

export const updateStaff = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { id } = req.params;
        const { name, role, phone, email, isActive } = req.body;

        const staff = await prisma.staff.updateMany({
            where: { id, storeId },
            data: { name, role, phone, email, isActive }
        });
        if (staff.count === 0) return res.status(404).json({ message: 'Staff not found' });
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ message: 'Failed to update staff' }); }
};

export const deleteStaff = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { id } = req.params;
        await prisma.staff.updateMany({ where: { id, storeId }, data: { isActive: false } });
        res.json({ message: 'Staff deactivated' });
    } catch (e) { res.status(500).json({ message: 'Failed to delete staff' }); }
};

// ── SHIFTS ───────────────────────────────────────────────────

export const getShifts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { staffId, limit = '20' } = req.query;
        const where: any = { storeId };
        if (staffId) where.staffId = staffId as string;

        const shifts = await prisma.shift.findMany({
            where,
            include: {
                staff: { select: { id: true, name: true, role: true } },
                flags: true
            },
            orderBy: { startTime: 'desc' },
            take: parseInt(limit as string)
        });
        res.json(shifts);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch shifts' }); }
};

export const createShift = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { staffId, startTime, endTime, notes } = req.body;
        if (!staffId || !startTime) return res.status(400).json({ message: 'staffId and startTime required' });

        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : null;

        // Calculate sales during this shift window if endTime provided
        let salesTotal = 0;
        if (end) {
            const sales = await prisma.sale.findMany({
                where: { storeId, dateTime: { gte: start, lte: end } }
            });
            salesTotal = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        }

        const shift = await prisma.shift.create({
            data: { storeId, staffId, startTime: start, endTime: end, notes, salesTotal },
            include: { staff: { select: { id: true, name: true, role: true } } }
        });

        // Auto-run flag detection after shift is logged
        if (end) await detectShiftFlags(storeId, shift.id, salesTotal, start, end);

        res.status(201).json(shift);
    } catch (e) { res.status(500).json({ message: 'Failed to create shift' }); }
};

export const updateShift = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { id } = req.params;
        const { endTime, notes } = req.body;

        const end = endTime ? new Date(endTime) : undefined;
        const existing = await prisma.shift.findFirst({ where: { id, storeId } });
        if (!existing) return res.status(404).json({ message: 'Shift not found' });

        let salesTotal = existing.salesTotal ?? 0;
        if (end && existing.startTime) {
            const sales = await prisma.sale.findMany({
                where: { storeId, dateTime: { gte: existing.startTime, lte: end } }
            });
            salesTotal = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        }

        const shift = await prisma.shift.update({
            where: { id },
            data: { endTime: end, notes, salesTotal },
            include: { staff: { select: { id: true, name: true, role: true } }, flags: true }
        });

        if (end) await detectShiftFlags(storeId, id, salesTotal, existing.startTime, end);
        res.json(shift);
    } catch (e) { res.status(500).json({ message: 'Failed to update shift' }); }
};

// ── FLAGS ────────────────────────────────────────────────────

export const getFlags = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const flags = await prisma.staffFlag.findMany({
            where: { storeId, isResolved: false },
            include: { shift: { include: { staff: { select: { id: true, name: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(flags);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch flags' }); }
};

export const resolveFlag = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { id } = req.params;
        const { resolvedNote } = req.body;

        await prisma.staffFlag.updateMany({
            where: { id, storeId },
            data: { isResolved: true, resolvedNote }
        });
        res.json({ message: 'Flag resolved' });
    } catch (e) { res.status(500).json({ message: 'Failed to resolve flag' }); }
};

export const createManualFlag = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const { staffId, shiftId, title, description, severity } = req.body;
        if (!title) return res.status(400).json({ message: 'Title required' });

        const flag = await prisma.staffFlag.create({
            data: { storeId, staffId, shiftId, type: 'manual', severity: severity || 'warning', title, description: description || '' }
        });
        res.status(201).json(flag);
    } catch (e) { res.status(500).json({ message: 'Failed to create flag' }); }
};

// ── STAFF PERFORMANCE ────────────────────────────────────────

export const getStaffPerformance = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const staff = await prisma.staff.findMany({
            where: { storeId, isActive: true },
            include: {
                shifts: {
                    where: { startTime: { gte: thirtyDaysAgo }, endTime: { not: null } },
                    include: { flags: true }
                }
            }
        });

        const performance = staff.map(member => {
            const completedShifts = member.shifts.filter(s => s.endTime);
            const totalShifts = completedShifts.length;
            const totalSales = completedShifts.reduce((sum, s) => sum + (s.salesTotal || 0), 0);
            const avgSalesPerShift = totalShifts > 0 ? totalSales / totalShifts : 0;
            const totalHours = completedShifts.reduce((sum, s) => {
                if (!s.endTime) return sum;
                return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
            }, 0);
            const salesPerHour = totalHours > 0 ? totalSales / totalHours : 0;
            const flagCount = completedShifts.reduce((sum, s) => sum + s.flags.filter(f => !f.isResolved).length, 0);

            return {
                id: member.id,
                name: member.name,
                role: member.role,
                totalShifts,
                totalHours: Math.round(totalHours * 10) / 10,
                totalSales: Math.round(totalSales * 100) / 100,
                avgSalesPerShift: Math.round(avgSalesPerShift * 100) / 100,
                salesPerHour: Math.round(salesPerHour * 100) / 100,
                openFlags: flagCount,
                recentShifts: completedShifts.slice(0, 3).map(s => ({
                    id: s.id,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    salesTotal: s.salesTotal,
                    flagCount: s.flags.length
                }))
            };
        });

        // Sort by total sales desc
        performance.sort((a, b) => b.totalSales - a.totalSales);
        res.json(performance);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch performance' }); }
};

// ── SHRINKAGE DETECTION ──────────────────────────────────────

export const detectShrinkage = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store' });

        const results = await runShrinkageDetection(storeId);
        res.json(results);
    } catch (e) { res.status(500).json({ message: 'Failed to run shrinkage detection' }); }
};

// Internal: run shrinkage detection and create flags
export async function runShrinkageDetection(storeId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const products = await prisma.product.findMany({
        where: { storeId, isActive: true },
        include: {
            inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 2 },
            saleItems: { where: { sale: { dateTime: { gte: sevenDaysAgo } } } },
            invoiceItems: { where: { invoice: { createdAt: { gte: sevenDaysAgo } } } }
        }
    });

    const flagged = [];

    for (const product of products) {
        const snapshots = product.inventorySnapshots;
        if (snapshots.length < 2) continue;

        const latest = snapshots[0].quantityOnHand;
        const previous = snapshots[1].quantityOnHand;

        const unitsSold = product.saleItems.reduce((sum, si) => sum + si.quantity, 0);
        const unitsReceived = product.invoiceItems.reduce((sum, ii) => sum + ii.quantity, 0);

        // Expected stock = previous + received - sold
        const expectedStock = previous + unitsReceived - unitsSold;
        const variance = expectedStock - latest;

        // Flag if more than 5 units or $10 value unaccounted for
        if (variance > 5 || variance * product.costPrice > 10) {
            const value = Math.round(variance * product.costPrice * 100) / 100;

            // Check if flag already exists for this product recently
            const existing = await prisma.staffFlag.findFirst({
                where: { storeId, type: 'shrinkage', isResolved: false, description: { contains: product.name } }
            });
            if (existing) continue;

            await prisma.staffFlag.create({
                data: {
                    storeId,
                    type: 'shrinkage',
                    severity: value > 50 ? 'critical' : 'warning',
                    title: `Inventory Shrinkage: ${product.name}`,
                    description: `Expected ${expectedStock} units, found ${latest}. Missing ${variance} units (~$${value}). Possible theft, damage, or miscounting.`,
                    value
                }
            });

            flagged.push({ product: product.name, variance, value });
        }
    }

    return { checked: products.length, flagged };
}

// Internal: detect flags after shift logged
async function detectShiftFlags(storeId: string, shiftId: string, salesTotal: number, start: Date, end: Date) {
    // Compare this shift's sales against average for same time window
    const durationHours = (end.getTime() - start.getTime()) / 3600000;
    if (durationHours < 1) return;

    // Get all completed shifts in last 30 days for comparison
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentShifts = await prisma.shift.findMany({
        where: { storeId, endTime: { not: null }, startTime: { gte: thirtyDaysAgo }, id: { not: shiftId } }
    });

    if (recentShifts.length < 3) return; // Not enough data

    const avgSalesPerHour = recentShifts.reduce((sum, s) => {
        const hours = s.endTime ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000 : 0;
        return sum + (hours > 0 ? (s.salesTotal || 0) / hours : 0);
    }, 0) / recentShifts.length;

    const thisShiftPerHour = salesTotal / durationHours;
    const dropPercent = avgSalesPerHour > 0 ? ((avgSalesPerHour - thisShiftPerHour) / avgSalesPerHour) * 100 : 0;

    // Flag if sales are more than 40% below average
    if (dropPercent > 40 && avgSalesPerHour > 0) {
        const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { staff: true } });
        await prisma.staffFlag.create({
            data: {
                storeId,
                shiftId,
                staffId: shift?.staffId,
                type: 'low_sales',
                severity: dropPercent > 60 ? 'critical' : 'warning',
                title: `Low Sales During Shift — ${shift?.staff?.name || 'Unknown'}`,
                description: `Sales were $${salesTotal.toFixed(2)} during this shift ($${thisShiftPerHour.toFixed(2)}/hr). Store average is $${avgSalesPerHour.toFixed(2)}/hr — ${Math.round(dropPercent)}% below normal.`,
                value: Math.round(dropPercent)
            }
        });
    }
}
