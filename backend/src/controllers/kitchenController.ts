// Kitchen module controller — endpoints for menu items, recipes, meal plans,
// consumption events, vendors, purchase orders, and variance reconciliation.

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';
import {
    forecastWeeklyDemand,
    persistDraftPurchaseOrders,
    nextWeekStart,
} from '../services/kitchenForecastService';
import { sendPurchaseOrderEmail } from '../services/kitchenEmailService';
import { computeAndSaveVariance } from '../services/kitchenVarianceService';
import { seedKitchenStarterPack } from '../services/kitchenStarterPack';

const requireStore = async (req: Request, res: Response): Promise<string | null> => {
    const storeId = await getStoreId(req);
    if (!storeId) {
        res.status(403).json({ message: 'No active store found' });
        return null;
    }
    return storeId;
};

const parseDate = (s: string | undefined): Date | null => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// ────────────────────────────────────────────────────────────────────────────
// VENDORS
// ────────────────────────────────────────────────────────────────────────────

export const listVendors = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const vendors = await prisma.vendor.findMany({
        where: { storeId },
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true, purchaseOrders: true } } },
    });
    res.json({ vendors });
};

export const createVendor = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { name, contactEmail, contactPhone, notes, autoSendEnabled, leadTimeDays, minOrderValue } = req.body;
    if (!name) return res.status(400).json({ message: 'Vendor name is required' });
    const vendor = await prisma.vendor.create({
        data: {
            storeId,
            name,
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || null,
            notes: notes || null,
            autoSendEnabled: !!autoSendEnabled,
            leadTimeDays: leadTimeDays ?? 2,
            minOrderValue: minOrderValue ?? null,
        },
    });
    res.status(201).json({ vendor });
};

export const updateVendor = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const existing = await prisma.vendor.findFirst({ where: { id, storeId } });
    if (!existing) return res.status(404).json({ message: 'Vendor not found' });
    const updated = await prisma.vendor.update({
        where: { id },
        data: {
            name: req.body.name ?? existing.name,
            contactEmail: req.body.contactEmail ?? existing.contactEmail,
            contactPhone: req.body.contactPhone ?? existing.contactPhone,
            notes: req.body.notes ?? existing.notes,
            autoSendEnabled: req.body.autoSendEnabled ?? existing.autoSendEnabled,
            leadTimeDays: req.body.leadTimeDays ?? existing.leadTimeDays,
            minOrderValue: req.body.minOrderValue ?? existing.minOrderValue,
        },
    });
    res.json({ vendor: updated });
};

// ────────────────────────────────────────────────────────────────────────────
// MENU ITEMS + RECIPES
// ────────────────────────────────────────────────────────────────────────────

export const listMenuItems = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const items = await prisma.menuItem.findMany({
        where: { storeId, isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
            recipes: { include: { product: { select: { id: true, name: true, unit: true, costPrice: true } } } },
        },
    });
    res.json({ menuItems: items });
};

export const createMenuItem = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { name, category, description, defaultServings, recipes } = req.body;
    if (!name) return res.status(400).json({ message: 'Menu item name is required' });
    const item = await prisma.menuItem.create({
        data: {
            storeId,
            name,
            category: category || null,
            description: description || null,
            defaultServings: defaultServings ?? 1,
            recipes: recipes && Array.isArray(recipes) ? {
                create: recipes.map((r: any) => ({
                    productId: r.productId,
                    qtyPerServing: r.qtyPerServing,
                    unit: r.unit,
                    notes: r.notes || null,
                })),
            } : undefined,
        },
        include: { recipes: { include: { product: true } } },
    });
    res.status(201).json({ menuItem: item });
};

export const updateMenuItem = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const existing = await prisma.menuItem.findFirst({ where: { id, storeId } });
    if (!existing) return res.status(404).json({ message: 'Menu item not found' });

    // If recipes are supplied, replace all (versioned via supersede if needed)
    const { recipes, ...rest } = req.body;
    const tx = await prisma.$transaction(async (db) => {
        const updated = await db.menuItem.update({
            where: { id },
            data: {
                name: rest.name ?? existing.name,
                category: rest.category ?? existing.category,
                description: rest.description ?? existing.description,
                defaultServings: rest.defaultServings ?? existing.defaultServings,
                isActive: rest.isActive ?? existing.isActive,
                version: recipes ? existing.version + 1 : existing.version,
            },
        });

        if (Array.isArray(recipes)) {
            await db.recipe.deleteMany({ where: { menuItemId: id } });
            if (recipes.length > 0) {
                await db.recipe.createMany({
                    data: recipes.map((r: any) => ({
                        menuItemId: id,
                        productId: r.productId,
                        qtyPerServing: r.qtyPerServing,
                        unit: r.unit,
                        notes: r.notes || null,
                    })),
                });
            }
        }
        return db.menuItem.findUnique({ where: { id }, include: { recipes: { include: { product: true } } } });
    });
    res.json({ menuItem: tx });
};

export const deleteMenuItem = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const existing = await prisma.menuItem.findFirst({ where: { id, storeId } });
    if (!existing) return res.status(404).json({ message: 'Menu item not found' });
    // Soft delete to preserve historical meal plans / consumption events
    await prisma.menuItem.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Menu item archived' });
};

// ────────────────────────────────────────────────────────────────────────────
// MEAL PLANS
// ────────────────────────────────────────────────────────────────────────────

export const listMealPlans = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const start = parseDate(req.query.weekStart as string);
    if (!start) return res.status(400).json({ message: 'weekStart is required (YYYY-MM-DD)' });
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);

    const plans = await prisma.mealPlan.findMany({
        where: { storeId, date: { gte: start, lte: end } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        include: { menuItem: { select: { id: true, name: true, category: true } } },
    });
    res.json({ weekStart: start, weekEnd: end, plans });
};

export const upsertMealPlan = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { date, menuItemId, plannedServings, actualServings, notes } = req.body;
    const day = parseDate(date);
    if (!day || !menuItemId) return res.status(400).json({ message: 'date and menuItemId required' });

    const plan = await prisma.mealPlan.upsert({
        where: { storeId_date_menuItemId: { storeId, date: day, menuItemId } },
        update: {
            plannedServings: plannedServings ?? undefined,
            actualServings: actualServings ?? undefined,
            notes: notes ?? undefined,
        },
        create: {
            storeId,
            date: day,
            menuItemId,
            plannedServings: plannedServings ?? 0,
            actualServings: actualServings ?? null,
            notes: notes || null,
        },
    });
    res.json({ plan });
};

export const deleteMealPlan = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const existing = await prisma.mealPlan.findFirst({ where: { id, storeId } });
    if (!existing) return res.status(404).json({ message: 'Meal plan not found' });
    await prisma.mealPlan.delete({ where: { id } });
    res.json({ message: 'Meal plan removed' });
};

export const copyMealPlanWeek = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const fromStart = parseDate(req.body.fromWeekStart);
    const toStart = parseDate(req.body.toWeekStart);
    if (!fromStart || !toStart) return res.status(400).json({ message: 'fromWeekStart and toWeekStart required' });

    const fromEnd = new Date(fromStart); fromEnd.setUTCDate(fromEnd.getUTCDate() + 6);
    const source = await prisma.mealPlan.findMany({
        where: { storeId, date: { gte: fromStart, lte: fromEnd } },
    });

    const dayShift = Math.round((toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24));
    let copied = 0;
    for (const p of source) {
        const newDate = new Date(p.date); newDate.setUTCDate(newDate.getUTCDate() + dayShift);
        await prisma.mealPlan.upsert({
            where: { storeId_date_menuItemId: { storeId, date: newDate, menuItemId: p.menuItemId } },
            update: { plannedServings: p.plannedServings },
            create: { storeId, date: newDate, menuItemId: p.menuItemId, plannedServings: p.plannedServings },
        });
        copied++;
    }
    res.json({ copied });
};

// ────────────────────────────────────────────────────────────────────────────
// CONSUMPTION EVENTS — source-agnostic ingestion
// ────────────────────────────────────────────────────────────────────────────

export const recordConsumption = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { productId, menuItemId, qty, unit, source, recordedAt, notes } = req.body;
    if (!productId || qty == null || !unit || !source) {
        return res.status(400).json({ message: 'productId, qty, unit, source are required' });
    }
    const userId = (req as any).user?.userId ?? null;
    const event = await prisma.consumptionEvent.create({
        data: {
            storeId,
            productId,
            menuItemId: menuItemId || null,
            qty,
            unit,
            source,
            recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
            recordedBy: userId,
            notes: notes || null,
        },
    });
    res.status(201).json({ event });
};

/**
 * Tablet flow: log a meal served. Increments MealPlan.actualServings and
 * fires one ConsumptionEvent per recipe ingredient (source = "meal_served").
 */
export const logMealServed = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { menuItemId, date, servings = 1 } = req.body;
    if (!menuItemId) return res.status(400).json({ message: 'menuItemId required' });
    const day = parseDate(date) ?? parseDate(new Date().toISOString().slice(0, 10))!;
    const userId = (req as any).user?.userId ?? null;

    const menuItem = await prisma.menuItem.findFirst({
        where: { id: menuItemId, storeId },
        include: { recipes: true },
    });
    if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });

    await prisma.$transaction(async (db) => {
        // Bump actualServings on the day's meal plan (create one if missing)
        await db.mealPlan.upsert({
            where: { storeId_date_menuItemId: { storeId, date: day, menuItemId } },
            update: { actualServings: { increment: servings } },
            create: { storeId, date: day, menuItemId, plannedServings: 0, actualServings: servings },
        });

        for (const r of menuItem.recipes) {
            await db.consumptionEvent.create({
                data: {
                    storeId,
                    productId: r.productId,
                    menuItemId,
                    qty: r.qtyPerServing * servings,
                    unit: r.unit,
                    source: 'meal_served',
                    recordedBy: userId,
                },
            });
        }
    });

    res.json({ message: `${servings} serving(s) of ${menuItem.name} logged` });
};

// ────────────────────────────────────────────────────────────────────────────
// PURCHASE ORDERS — forecast, draft, approve, send
// ────────────────────────────────────────────────────────────────────────────

export const previewForecast = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const start = parseDate(req.query.weekStart as string);
    if (!start) return res.status(400).json({ message: 'weekStart required (YYYY-MM-DD)' });
    const forecast = await forecastWeeklyDemand(storeId, start);
    res.json(forecast);
};

export const generateWeeklyDraftPOs = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const userId = (req as any).user?.userId ?? 'system';

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const weekStart = parseDate(req.body.weekStart) ?? nextWeekStart(new Date(), store.weeklyOrderDay);
    const forecast = await forecastWeeklyDemand(storeId, weekStart);
    const ids = await persistDraftPurchaseOrders(forecast, userId);
    res.json({ created: ids.length, purchaseOrderIds: ids, skipped: forecast.skippedItems });
};

export const listPurchaseOrders = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const status = req.query.status as string | undefined;
    const where: any = { storeId };
    if (status) where.status = status;

    const pos = await prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            vendor: { select: { id: true, name: true, contactEmail: true, autoSendEnabled: true } },
            items: true,
            _count: { select: { events: true } },
        },
    });
    res.json({ purchaseOrders: pos });
};

export const getPurchaseOrder = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findFirst({
        where: { id, storeId },
        include: {
            vendor: true,
            items: true,
            events: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!po) return res.status(404).json({ message: 'PO not found' });
    res.json({ purchaseOrder: po });
};

export const updatePurchaseOrderItems = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const userId = (req as any).user?.userId ?? 'system';

    const po = await prisma.purchaseOrder.findFirst({ where: { id, storeId } });
    if (!po) return res.status(404).json({ message: 'PO not found' });
    if (po.status !== 'DRAFT' && po.status !== 'PENDING_REVIEW') {
        return res.status(400).json({ message: `Cannot edit PO in status ${po.status}` });
    }

    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items[] required' });

    let total = 0;
    await prisma.$transaction(async (db) => {
        await db.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        for (const it of items) {
            const lineTotal = (it.qty ?? 0) * (it.unitCost ?? 0);
            total += lineTotal;
            await db.purchaseOrderItem.create({
                data: {
                    purchaseOrderId: id,
                    productId: it.productId,
                    productName: it.productName,
                    qty: it.qty,
                    unit: it.unit,
                    unitCost: it.unitCost,
                    lineTotal,
                    caseSize: it.caseSize ?? null,
                },
            });
        }
        await db.purchaseOrder.update({
            where: { id },
            data: {
                totalAmount: total,
                events: { create: { type: 'EDITED', actorId: userId, payload: JSON.stringify({ itemCount: items.length }) } },
            },
        });
    });
    res.json({ message: 'PO items updated', totalAmount: total });
};

export const approveAndSendPurchaseOrder = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const userId = (req as any).user?.userId ?? 'system';

    const po = await prisma.purchaseOrder.findFirst({ where: { id, storeId } });
    if (!po) return res.status(404).json({ message: 'PO not found' });
    if (po.status === 'SENT') return res.status(400).json({ message: 'Already sent' });

    await prisma.purchaseOrder.update({
        where: { id },
        data: {
            status: 'APPROVED',
            approvedBy: userId,
            approvedAt: new Date(),
            events: { create: { type: 'APPROVED', actorId: userId } },
        },
    });

    const sent = await sendPurchaseOrderEmail(id, userId);
    const refreshed = await prisma.purchaseOrder.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: 'desc' }, take: 5 } } });
    res.json({ sent, purchaseOrder: refreshed });
};

export const markPurchaseOrderReceived = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const userId = (req as any).user?.userId ?? 'system';
    const po = await prisma.purchaseOrder.findFirst({ where: { id, storeId }, include: { items: true } });
    if (!po) return res.status(404).json({ message: 'PO not found' });

    await prisma.$transaction(async (db) => {
        await db.purchaseOrder.update({
            where: { id },
            data: {
                status: 'RECEIVED',
                events: { create: { type: 'RECEIVED', actorId: userId } },
            },
        });
        // Bump inventory snapshots
        for (const it of po.items) {
            const latest = await db.inventorySnapshot.findFirst({
                where: { productId: it.productId },
                orderBy: { snapshotDate: 'desc' },
            });
            const current = latest?.quantityOnHand ?? 0;
            await db.inventorySnapshot.create({
                data: {
                    storeId,
                    productId: it.productId,
                    quantityOnHand: current + Math.round(it.qty),
                },
            });
        }
    });
    res.json({ message: 'PO marked received and inventory updated' });
};

export const cancelPurchaseOrder = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const userId = (req as any).user?.userId ?? 'system';
    const po = await prisma.purchaseOrder.findFirst({ where: { id, storeId } });
    if (!po) return res.status(404).json({ message: 'PO not found' });
    await prisma.purchaseOrder.update({
        where: { id },
        data: {
            status: 'CANCELLED',
            events: { create: { type: 'CANCELLED', actorId: userId } },
        },
    });
    res.json({ message: 'PO cancelled' });
};

// ────────────────────────────────────────────────────────────────────────────
// VARIANCE
// ────────────────────────────────────────────────────────────────────────────

export const submitWeeklyCounts = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const weekStart = parseDate(req.body.weekStart);
    const weekEnd = parseDate(req.body.weekEnd);
    const counts = req.body.counts;
    if (!weekStart || !weekEnd || !Array.isArray(counts)) {
        return res.status(400).json({ message: 'weekStart, weekEnd, counts[] required' });
    }
    const rows = await computeAndSaveVariance(storeId, weekStart, weekEnd, counts);
    res.json({ variances: rows });
};

export const listVariances = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const weekStart = parseDate(req.query.weekStart as string);
    const where: any = { storeId };
    if (weekStart) where.weekStart = weekStart;
    const rows = await prisma.recipeVariance.findMany({
        where,
        orderBy: { variancePct: 'desc' },
        include: { product: { select: { name: true, unit: true } } },
    });
    res.json({ variances: rows });
};

export const acceptVarianceAdjustment = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const v = await prisma.recipeVariance.findFirst({ where: { id, storeId } });
    if (!v) return res.status(404).json({ message: 'Variance row not found' });

    // Update affected recipe rows: scale qtyPerServing by (actual/theoretical)
    const factor = v.theoreticalQty > 0 ? v.actualQty / v.theoreticalQty : 1;
    await prisma.$transaction(async (db) => {
        const recipes = await db.recipe.findMany({ where: { productId: v.productId } });
        for (const r of recipes) {
            await db.recipe.update({
                where: { id: r.id },
                data: { qtyPerServing: r.qtyPerServing * factor },
            });
        }
        await db.recipeVariance.update({
            where: { id },
            data: { resolved: true, resolution: 'accepted_recipe_change' },
        });
    });
    res.json({ message: 'Recipes adjusted', factor });
};

// ────────────────────────────────────────────────────────────────────────────
// STORE CONFIG
// ────────────────────────────────────────────────────────────────────────────

export const getKitchenConfig = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { kitchenMode: true, weeklyOrderDay: true, servingsBuffer: true },
    });
    res.json(store);
};

export const updateKitchenConfig = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { kitchenMode, weeklyOrderDay, servingsBuffer } = req.body;
    const updated = await prisma.store.update({
        where: { id: storeId },
        data: {
            kitchenMode: kitchenMode ?? undefined,
            weeklyOrderDay: weeklyOrderDay ?? undefined,
            servingsBuffer: servingsBuffer ?? undefined,
        },
        select: { kitchenMode: true, weeklyOrderDay: true, servingsBuffer: true },
    });
    res.json(updated);
};

// One-click "Enable kitchen mode": flips the flag and (optionally) seeds the
// starter pack of vendors + ingredients + menu items so the user can start
// using the system immediately without any data entry.
export const enableKitchenMode = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { weeklyOrderDay, servingsBuffer, loadStarterPack } = req.body;

    const updated = await prisma.store.update({
        where: { id: storeId },
        data: {
            kitchenMode: true,
            weeklyOrderDay: weeklyOrderDay ?? undefined,
            servingsBuffer: servingsBuffer ?? undefined,
        },
        select: { kitchenMode: true, weeklyOrderDay: true, servingsBuffer: true },
    });

    let starterResult = null;
    if (loadStarterPack !== false) {
        starterResult = await seedKitchenStarterPack(storeId);
    }
    res.json({ config: updated, starterPack: starterResult });
};

// Load the starter pack on demand (idempotent — re-running is safe).
export const loadStarterPack = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const result = await seedKitchenStarterPack(storeId);
    res.json({ message: 'Starter pack loaded', result });
};
