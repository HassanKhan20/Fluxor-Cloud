// Retirement-home module controller.
// Handles facility-type switching, residents, dietary profiles, care plans,
// daily census, and the production prep-sheet aggregation.

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getStoreId } from '../lib/storeContext';
import { computeStockoutWatch } from '../services/stockoutWatchService';

const requireStore = async (req: Request, res: Response): Promise<string | null> => {
    const storeId = await getStoreId(req);
    if (!storeId) {
        res.status(403).json({ message: 'No active store found' });
        return null;
    }
    return storeId;
};

const parseDate = (s: string | undefined | null): Date | null => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// ────────────────────────────────────────────────────────────────────────────
// FACILITY TYPE — the master switch
// ────────────────────────────────────────────────────────────────────────────

export const getFacilityType = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { facilityType: true, facilityTypeSet: true, kitchenMode: true, name: true },
    });
    res.json(store);
};

export const setFacilityType = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { facilityType } = req.body;
    if (facilityType !== 'CONVENIENCE_STORE' && facilityType !== 'RETIREMENT_HOME') {
        return res.status(400).json({ message: 'facilityType must be CONVENIENCE_STORE or RETIREMENT_HOME' });
    }
    const updated = await prisma.store.update({
        where: { id: storeId },
        data: {
            facilityType,
            facilityTypeSet: true,
            // For retirement home, also flip kitchenMode on (it gates kitchen features)
            kitchenMode: facilityType === 'RETIREMENT_HOME',
        },
        select: { facilityType: true, facilityTypeSet: true, kitchenMode: true },
    });
    res.json(updated);
};

// ────────────────────────────────────────────────────────────────────────────
// RESIDENTS
// ────────────────────────────────────────────────────────────────────────────

export const listResidents = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const includeInactive = req.query.includeInactive === 'true';
    const residents = await prisma.resident.findMany({
        where: { storeId, ...(includeInactive ? {} : { isActive: true }) },
        orderBy: [{ room: 'asc' }, { name: 'asc' }],
        include: { dietaryProfile: true, carePlan: true },
    });
    res.json({ residents });
};

export const getResident = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const r = await prisma.resident.findFirst({
        where: { id: req.params.id, storeId },
        include: { dietaryProfile: true, carePlan: true },
    });
    if (!r) return res.status(404).json({ message: 'Resident not found' });
    res.json({ resident: r });
};

export const createResident = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { name, room, admissionDate, notes, dietaryProfile, carePlan } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const r = await prisma.resident.create({
        data: {
            storeId,
            name,
            room: room || null,
            admissionDate: admissionDate ? new Date(admissionDate) : null,
            notes: notes || null,
            isActive: true,
            // Always create a dietary profile and care plan with sensible defaults
            dietaryProfile: { create: dietaryProfile ?? {} },
            carePlan: { create: carePlan ?? {} },
        },
        include: { dietaryProfile: true, carePlan: true },
    });
    res.status(201).json({ resident: r });
};

export const updateResident = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const existing = await prisma.resident.findFirst({ where: { id, storeId } });
    if (!existing) return res.status(404).json({ message: 'Resident not found' });

    const { dietaryProfile, carePlan, ...rest } = req.body;
    const r = await prisma.$transaction(async (db) => {
        const updated = await db.resident.update({
            where: { id },
            data: {
                name: rest.name ?? existing.name,
                room: rest.room ?? existing.room,
                admissionDate: rest.admissionDate !== undefined ? (rest.admissionDate ? new Date(rest.admissionDate) : null) : existing.admissionDate,
                dischargeDate: rest.dischargeDate !== undefined ? (rest.dischargeDate ? new Date(rest.dischargeDate) : null) : existing.dischargeDate,
                isActive: rest.isActive ?? existing.isActive,
                notes: rest.notes ?? existing.notes,
            },
        });
        if (dietaryProfile) {
            await db.dietaryProfile.upsert({
                where: { residentId: id },
                update: dietaryProfile,
                create: { residentId: id, ...dietaryProfile },
            });
        }
        if (carePlan) {
            // Bump version on any care-plan change for historical accuracy
            const current = await db.carePlan.findUnique({ where: { residentId: id } });
            await db.carePlan.upsert({
                where: { residentId: id },
                update: { ...carePlan, version: (current?.version ?? 1) + 1 },
                create: { residentId: id, ...carePlan },
            });
        }
        return db.resident.findUnique({
            where: { id },
            include: { dietaryProfile: true, carePlan: true },
        });
    });
    res.json({ resident: r });
};

export const archiveResident = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const existing = await prisma.resident.findFirst({ where: { id, storeId } });
    if (!existing) return res.status(404).json({ message: 'Resident not found' });
    await prisma.resident.update({
        where: { id },
        data: { isActive: false, dischargeDate: new Date() },
    });
    res.json({ message: 'Resident archived' });
};

// ────────────────────────────────────────────────────────────────────────────
// DAILY CENSUS — drives meal-plan scaling
// ────────────────────────────────────────────────────────────────────────────

export const upsertCensus = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const date = parseDate(req.body.date);
    const count = req.body.count;
    const guests = req.body.guests ?? 0;
    const notes = req.body.notes ?? null;
    if (!date || typeof count !== 'number') return res.status(400).json({ message: 'date and count required' });

    const row = await prisma.dailyCensus.upsert({
        where: { storeId_date: { storeId, date } },
        update: { count, guests, notes },
        create: { storeId, date, count, guests, notes },
    });
    res.json({ census: row });
};

export const listCensus = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const start = parseDate(req.query.start as string);
    const end = parseDate(req.query.end as string);
    const where: any = { storeId };
    if (start && end) where.date = { gte: start, lte: end };
    const rows = await prisma.dailyCensus.findMany({ where, orderBy: { date: 'asc' } });
    res.json({ census: rows });
};

// Auto-fill census from resident roster — quick way to bootstrap a week
// based on currently-active residents.
export const autoFillCensusWeek = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const start = parseDate(req.body.weekStart);
    if (!start) return res.status(400).json({ message: 'weekStart required' });

    const activeCount = await prisma.resident.count({ where: { storeId, isActive: true } });
    const created: any[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setUTCDate(d.getUTCDate() + i);
        const row = await prisma.dailyCensus.upsert({
            where: { storeId_date: { storeId, date: d } },
            update: {}, // Don't overwrite manual entries
            create: { storeId, date: d, count: activeCount },
        });
        created.push(row);
    }
    res.json({ filled: created.length, count: activeCount });
};

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTION PREP SHEET — single read-only aggregation for kitchen staff
// ────────────────────────────────────────────────────────────────────────────

export const getPrepSheet = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const date = parseDate(req.query.date as string) ?? parseDate(new Date().toISOString().slice(0, 10))!;

    // Find the day's meal plans
    const plans = await prisma.mealPlan.findMany({
        where: { storeId, date },
        include: { menuItem: { include: { recipes: { include: { product: true } } } } },
    });

    // Pull census for the day
    const census = await prisma.dailyCensus.findUnique({
        where: { storeId_date: { storeId, date } },
    });

    // Pull active residents + dietary profiles for diet-mod summary
    const residents = await prisma.resident.findMany({
        where: { storeId, isActive: true },
        include: { dietaryProfile: true },
    });

    // Diet modification summary
    const modSummary = {
        diabetic:        residents.filter(r => r.dietaryProfile?.diabetic).length,
        lowSodium:       residents.filter(r => r.dietaryProfile?.lowSodium).length,
        renal:           residents.filter(r => r.dietaryProfile?.renal).length,
        cardiac:         residents.filter(r => r.dietaryProfile?.cardiac).length,
        glutenFree:      residents.filter(r => r.dietaryProfile?.glutenFree).length,
        vegetarian:      residents.filter(r => r.dietaryProfile?.vegetarian).length,
        mechanicalSoft:  residents.filter(r => r.dietaryProfile?.texture === 'mechanical_soft').length,
        pureed:          residents.filter(r => r.dietaryProfile?.texture === 'pureed').length,
        thickenedLiquids: residents.filter(r => r.dietaryProfile?.texture === 'thickened_liquids').length,
        allergens:       residents.filter(r => r.dietaryProfile?.allergens).map(r => ({
            resident: r.name, room: r.room, allergens: r.dietaryProfile?.allergens,
        })),
    };

    // Build the dish-by-dish prep list
    const dishes = plans.map(p => {
        const servings = p.actualServings ?? p.plannedServings;
        return {
            mealPlanId: p.id,
            menuItemName: p.menuItem.name,
            category: p.menuItem.category,
            servings,
            ingredients: p.menuItem.recipes.map(r => ({
                productName: r.product.name,
                qtyTotal: r.qtyPerServing * servings,
                unit: r.unit,
            })),
        };
    });

    res.json({
        date,
        census,
        modSummary,
        dishes,
        residentsActive: residents.length,
    });
};

// ────────────────────────────────────────────────────────────────────────────
// TRAY TICKETS — one tray slip per active resident for a given meal
// ────────────────────────────────────────────────────────────────────────────

export const getTrayTickets = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const date = parseDate(req.query.date as string) ?? parseDate(new Date().toISOString().slice(0, 10))!;
    const meal = (req.query.meal as string) || 'lunch'; // breakfast | lunch | dinner — used to filter menu items

    const plans = await prisma.mealPlan.findMany({
        where: { storeId, date },
        include: { menuItem: true },
    });
    const residents = await prisma.resident.findMany({
        where: { storeId, isActive: true },
        include: { dietaryProfile: true },
        orderBy: [{ room: 'asc' }, { name: 'asc' }],
    });

    // Per-resident tray = the day's menu items, with warnings if any apply
    const tickets = residents.map(r => {
        const dp = r.dietaryProfile;
        const items = plans.map(p => {
            const warnings: string[] = [];
            if (dp) {
                const itemName = p.menuItem.name.toLowerCase();
                // Quick allergen heuristic — match resident's allergens against item name
                if (dp.allergens) {
                    const allergens = dp.allergens.toLowerCase().split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                    for (const a of allergens) {
                        if (a && itemName.includes(a)) warnings.push(`⚠ Contains ${a}`);
                    }
                }
                if (dp.vegetarian && /chicken|beef|cod|bacon|pork|fish|meatloaf/.test(itemName)) {
                    warnings.push('⚠ Vegetarian — substitute');
                }
                if (dp.texture !== 'regular') warnings.push(`Texture: ${dp.texture.replace('_', ' ')}`);
            }
            return { name: p.menuItem.name, category: p.menuItem.category, warnings };
        });
        return {
            residentId: r.id,
            residentName: r.name,
            room: r.room,
            diet: dp ? {
                diabetic: dp.diabetic, lowSodium: dp.lowSodium, renal: dp.renal,
                cardiac: dp.cardiac, glutenFree: dp.glutenFree, vegetarian: dp.vegetarian,
                texture: dp.texture, allergens: dp.allergens, dislikes: dp.dislikes,
                preferences: dp.preferences,
            } : null,
            items,
        };
    });

    res.json({ date, meal, tickets });
};

// ────────────────────────────────────────────────────────────────────────────
// SUPPLY ITEMS — non-food consumables (skeleton CRUD)
// ────────────────────────────────────────────────────────────────────────────

export const listSupplyItems = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const items = await prisma.supplyItem.findMany({
        where: { storeId, isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ supplyItems: items });
};

export const createSupplyItem = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const item = await prisma.supplyItem.create({
        data: {
            storeId,
            name: req.body.name,
            category: req.body.category || 'incontinence',
            unit: req.body.unit || 'ea',
            size: req.body.size || null,
            costPrice: req.body.costPrice ?? 0,
            caseSize: req.body.caseSize ?? 1,
            parLevel: req.body.parLevel ?? null,
            reorderThreshold: req.body.reorderThreshold ?? null,
            leadTimeDays: req.body.leadTimeDays ?? 2,
            vendorRefId: req.body.vendorRefId ?? null,
        },
    });
    res.status(201).json({ supplyItem: item });
};

export const recordSupplyConsumption = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const userId = (req as any).user?.userId ?? null;
    const ev = await prisma.supplyConsumption.create({
        data: {
            storeId,
            supplyItemId: req.body.supplyItemId,
            residentId: req.body.residentId || null,
            qty: req.body.qty,
            unit: req.body.unit,
            source: req.body.source || 'tablet',
            recordedBy: userId,
            notes: req.body.notes || null,
        },
    });
    res.status(201).json({ event: ev });
};

// ────────────────────────────────────────────────────────────────────────────
// STOCKOUT WATCH — predicts which ingredients will run out before next delivery
// ────────────────────────────────────────────────────────────────────────────

export const getStockoutWatch = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const rows = await computeStockoutWatch(storeId);
    const summary = {
        critical: rows.filter(r => r.urgency === 'critical').length,
        warning:  rows.filter(r => r.urgency === 'warning').length,
        watch:    rows.filter(r => r.urgency === 'watch').length,
        ok:       rows.filter(r => r.urgency === 'ok').length,
    };
    res.json({ rows, summary });
};

// ────────────────────────────────────────────────────────────────────────────
// BULK MEAL TALLY — CNA enters end-of-meal counts in one shot
// e.g. "Lunch served: 28 chicken, 19 meatloaf, 12 fish"
// ────────────────────────────────────────────────────────────────────────────

interface BulkTallyEntry { menuItemId: string; servings: number; }

export const bulkLogMeal = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { date, entries } = req.body as { date?: string; entries: BulkTallyEntry[] };
    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ message: 'entries[] required' });
    }
    const userId = (req as any).user?.userId ?? null;
    const day = parseDate(date) ?? parseDate(new Date().toISOString().slice(0, 10))!;

    let totalServings = 0;
    let totalEvents = 0;
    const results: { menuItemId: string; menuItemName: string; servings: number }[] = [];

    await prisma.$transaction(async (db) => {
        for (const entry of entries) {
            if (!entry.menuItemId || entry.servings == null || entry.servings <= 0) continue;
            const menuItem = await db.menuItem.findFirst({
                where: { id: entry.menuItemId, storeId },
                include: { recipes: true },
            });
            if (!menuItem) continue;

            await db.mealPlan.upsert({
                where: { storeId_date_menuItemId: { storeId, date: day, menuItemId: entry.menuItemId } },
                update: { actualServings: { increment: entry.servings } },
                create: {
                    storeId, date: day, menuItemId: entry.menuItemId,
                    plannedServings: 0,
                    actualServings: entry.servings,
                },
            });

            for (const r of menuItem.recipes) {
                await db.consumptionEvent.create({
                    data: {
                        storeId,
                        productId: r.productId,
                        menuItemId: entry.menuItemId,
                        qty: r.qtyPerServing * entry.servings,
                        unit: r.unit,
                        source: 'bulk_tally',
                        recordedBy: userId,
                    },
                });
                totalEvents++;
            }
            totalServings += entry.servings;
            results.push({ menuItemId: entry.menuItemId, menuItemName: menuItem.name, servings: entry.servings });
        }
    });

    res.json({ message: `Logged ${totalServings} serving(s) across ${results.length} dish(es)`, results, totalEvents });
};

// ────────────────────────────────────────────────────────────────────────────
// GUEST MEALS — drop-in family/visitor flat-fee meals
// ────────────────────────────────────────────────────────────────────────────

export const recordGuestMeal = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { menuItemId, guestName, paidAmount, paymentMethod, notes, date } = req.body;
    if (paidAmount == null || isNaN(Number(paidAmount))) {
        return res.status(400).json({ message: 'paidAmount is required' });
    }
    const userId = (req as any).user?.userId ?? null;
    const day = parseDate(date) ?? parseDate(new Date().toISOString().slice(0, 10))!;

    const result = await prisma.$transaction(async (db) => {
        const guestMeal = await db.guestMeal.create({
            data: {
                storeId,
                date: day,
                menuItemId: menuItemId || null,
                guestName: guestName || null,
                paidAmount: Number(paidAmount),
                paymentMethod: paymentMethod || 'cash',
                notes: notes || null,
                recordedBy: userId,
            },
        });

        // If a menu item was picked, fire recipe-level consumption events
        if (menuItemId) {
            const menuItem = await db.menuItem.findFirst({
                where: { id: menuItemId, storeId },
                include: { recipes: true },
            });
            if (menuItem) {
                for (const r of menuItem.recipes) {
                    await db.consumptionEvent.create({
                        data: {
                            storeId,
                            productId: r.productId,
                            menuItemId,
                            qty: r.qtyPerServing,
                            unit: r.unit,
                            source: 'guest_meal',
                            recordedBy: userId,
                            notes: guestName ? `Guest: ${guestName}` : null,
                        },
                    });
                }
            }
        }
        return guestMeal;
    });
    res.status(201).json({ guestMeal: result });
};

export const listGuestMeals = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const start = parseDate(req.query.start as string);
    const end = parseDate(req.query.end as string);
    const where: any = { storeId };
    if (start && end) where.date = { gte: start, lte: end };
    const meals = await prisma.guestMeal.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 100,
    });
    const total = meals.reduce((s, m) => s + m.paidAmount, 0);
    res.json({ guestMeals: meals, totalAmount: total, count: meals.length });
};

// ────────────────────────────────────────────────────────────────────────────
// LOG MEAL TO A RESIDENT — same as kitchen logMealServed but with residentId
// ────────────────────────────────────────────────────────────────────────────

export const logResidentMeal = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { menuItemId, residentId, date, servings = 1 } = req.body;
    if (!menuItemId) return res.status(400).json({ message: 'menuItemId required' });
    const day = parseDate(date) ?? parseDate(new Date().toISOString().slice(0, 10))!;
    const userId = (req as any).user?.userId ?? null;

    const menuItem = await prisma.menuItem.findFirst({
        where: { id: menuItemId, storeId },
        include: { recipes: true },
    });
    if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });

    // Validate resident if provided
    if (residentId) {
        const resident = await prisma.resident.findFirst({ where: { id: residentId, storeId } });
        if (!resident) return res.status(404).json({ message: 'Resident not found' });
    }

    await prisma.$transaction(async (db) => {
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
                    residentId: residentId || null,
                    qty: r.qtyPerServing * servings,
                    unit: r.unit,
                    source: residentId ? 'resident_meal' : 'meal_served',
                    recordedBy: userId,
                },
            });
        }
    });
    res.json({ message: `Logged ${servings} serving(s) of ${menuItem.name}${residentId ? ' to resident' : ''}` });
};

// ────────────────────────────────────────────────────────────────────────────
// PER-RESIDENT MEAL HISTORY — for compliance reports
// ────────────────────────────────────────────────────────────────────────────

export const getResidentMealHistory = async (req: Request, res: Response) => {
    const storeId = await requireStore(req, res); if (!storeId) return;
    const { id } = req.params;
    const start = parseDate(req.query.start as string);
    const end = parseDate(req.query.end as string);

    const resident = await prisma.resident.findFirst({ where: { id, storeId } });
    if (!resident) return res.status(404).json({ message: 'Resident not found' });

    const where: any = { storeId, residentId: id };
    if (start && end) where.recordedAt = { gte: start, lte: end };

    const events = await prisma.consumptionEvent.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        include: { menuItem: { select: { name: true, category: true } }, product: { select: { name: true } } },
        take: 500,
    });

    // Aggregate by meal — group ConsumptionEvents that share (menuItemId, day)
    const mealMap = new Map<string, { date: string; menuItemName: string; servings: number }>();
    for (const e of events) {
        if (!e.menuItem) continue;
        const dayKey = e.recordedAt.toISOString().slice(0, 10);
        const k = `${dayKey}-${e.menuItemId}`;
        const ex = mealMap.get(k);
        if (ex) continue; // count once per (day, menuItem)
        mealMap.set(k, { date: dayKey, menuItemName: e.menuItem.name, servings: 1 });
    }
    const meals = Array.from(mealMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    res.json({ resident, meals, eventCount: events.length });
};
