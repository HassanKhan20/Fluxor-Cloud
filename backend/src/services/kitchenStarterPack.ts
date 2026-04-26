// One-click starter pack for retirement-home kitchens.
// Seeds ~25 common ingredients (with sensible units, par levels, case sizes,
// and lead times) and 10 menu items with full recipes. Idempotent — safe to
// re-run; existing rows by name are reused.

import { prisma } from '../lib/prisma';

interface SeedIngredient {
    name: string;
    category: string;
    unit: string;
    costPrice: number;
    parLevel: number;
    reorderThreshold: number;
    caseSize: number;
    leadTimeDays: number;
    initialStock: number;
    vendor: string;
}

interface SeedRecipe {
    productName: string;
    qtyPerServing: number;
    unit: string;
}

interface SeedMenuItem {
    name: string;
    category: 'breakfast' | 'entree' | 'side' | 'dessert' | 'beverage';
    description: string;
    defaultServings: number;
    recipes: SeedRecipe[];
}

const VENDORS: { name: string; contactEmail: string; leadTimeDays: number; minOrderValue: number | null }[] = [
    { name: 'Sysco Foodservice',      contactEmail: 'orders@sysco.example',      leadTimeDays: 2, minOrderValue: 250 },
    { name: 'US Foods',                contactEmail: 'orders@usfoods.example',    leadTimeDays: 2, minOrderValue: 250 },
    { name: 'Local Produce Co',        contactEmail: 'orders@localproduce.example', leadTimeDays: 1, minOrderValue: 75 },
    { name: 'Dairy Fresh Distributor', contactEmail: 'orders@dairyfresh.example', leadTimeDays: 1, minOrderValue: 100 },
];

const INGREDIENTS: SeedIngredient[] = [
    // Proteins
    { name: 'Ground Beef 80/20',    category: 'protein',  unit: 'lb',  costPrice: 4.50, parLevel: 30, reorderThreshold: 10, caseSize: 10, leadTimeDays: 2, initialStock: 25, vendor: 'Sysco Foodservice' },
    { name: 'Chicken Breast',       category: 'protein',  unit: 'lb',  costPrice: 3.80, parLevel: 40, reorderThreshold: 12, caseSize: 10, leadTimeDays: 2, initialStock: 30, vendor: 'Sysco Foodservice' },
    { name: 'Cod Fillet',           category: 'protein',  unit: 'lb',  costPrice: 7.20, parLevel: 15, reorderThreshold: 5,  caseSize: 5,  leadTimeDays: 2, initialStock: 12, vendor: 'US Foods' },
    { name: 'Eggs',                 category: 'protein',  unit: 'ea',  costPrice: 0.22, parLevel: 360, reorderThreshold: 120, caseSize: 60, leadTimeDays: 1, initialStock: 240, vendor: 'Dairy Fresh Distributor' },
    { name: 'Bacon',                category: 'protein',  unit: 'lb',  costPrice: 5.40, parLevel: 12, reorderThreshold: 4,  caseSize: 5,  leadTimeDays: 2, initialStock: 8, vendor: 'Sysco Foodservice' },

    // Grains & starch
    { name: 'White Rice',           category: 'grain',    unit: 'lb',  costPrice: 0.95, parLevel: 50, reorderThreshold: 20, caseSize: 25, leadTimeDays: 2, initialStock: 40, vendor: 'US Foods' },
    { name: 'Pasta (penne)',        category: 'grain',    unit: 'lb',  costPrice: 1.25, parLevel: 30, reorderThreshold: 10, caseSize: 20, leadTimeDays: 2, initialStock: 20, vendor: 'US Foods' },
    { name: 'Bread (white loaf)',   category: 'grain',    unit: 'ea',  costPrice: 2.40, parLevel: 14, reorderThreshold: 6,  caseSize: 6,  leadTimeDays: 1, initialStock: 12, vendor: 'Local Produce Co' },
    { name: 'Hamburger Buns',       category: 'grain',    unit: 'ea',  costPrice: 0.40, parLevel: 96, reorderThreshold: 24, caseSize: 24, leadTimeDays: 1, initialStock: 72, vendor: 'Local Produce Co' },
    { name: 'All-Purpose Flour',    category: 'grain',    unit: 'lb',  costPrice: 0.80, parLevel: 25, reorderThreshold: 10, caseSize: 25, leadTimeDays: 2, initialStock: 25, vendor: 'US Foods' },

    // Dairy
    { name: 'Milk (gallon)',        category: 'dairy',    unit: 'gal', costPrice: 4.20, parLevel: 12, reorderThreshold: 4,  caseSize: 4,  leadTimeDays: 1, initialStock: 8, vendor: 'Dairy Fresh Distributor' },
    { name: 'Butter',               category: 'dairy',    unit: 'lb',  costPrice: 4.80, parLevel: 16, reorderThreshold: 6,  caseSize: 8,  leadTimeDays: 1, initialStock: 12, vendor: 'Dairy Fresh Distributor' },
    { name: 'Shredded Cheese',      category: 'dairy',    unit: 'lb',  costPrice: 5.20, parLevel: 12, reorderThreshold: 4,  caseSize: 5,  leadTimeDays: 1, initialStock: 8, vendor: 'Dairy Fresh Distributor' },
    { name: 'Plain Yogurt',         category: 'dairy',    unit: 'lb',  costPrice: 3.20, parLevel: 10, reorderThreshold: 4,  caseSize: 4,  leadTimeDays: 1, initialStock: 6, vendor: 'Dairy Fresh Distributor' },

    // Produce
    { name: 'Lettuce (head)',       category: 'produce',  unit: 'ea',  costPrice: 1.80, parLevel: 18, reorderThreshold: 6,  caseSize: 6,  leadTimeDays: 1, initialStock: 12, vendor: 'Local Produce Co' },
    { name: 'Tomatoes',             category: 'produce',  unit: 'lb',  costPrice: 2.10, parLevel: 20, reorderThreshold: 8,  caseSize: 10, leadTimeDays: 1, initialStock: 12, vendor: 'Local Produce Co' },
    { name: 'Yellow Onions',        category: 'produce',  unit: 'lb',  costPrice: 0.95, parLevel: 25, reorderThreshold: 10, caseSize: 25, leadTimeDays: 1, initialStock: 20, vendor: 'Local Produce Co' },
    { name: 'Carrots',              category: 'produce',  unit: 'lb',  costPrice: 1.10, parLevel: 20, reorderThreshold: 8,  caseSize: 25, leadTimeDays: 1, initialStock: 15, vendor: 'Local Produce Co' },
    { name: 'Potatoes (russet)',    category: 'produce',  unit: 'lb',  costPrice: 0.75, parLevel: 50, reorderThreshold: 20, caseSize: 50, leadTimeDays: 1, initialStock: 40, vendor: 'Local Produce Co' },
    { name: 'Apples',               category: 'produce',  unit: 'lb',  costPrice: 1.60, parLevel: 30, reorderThreshold: 10, caseSize: 20, leadTimeDays: 1, initialStock: 20, vendor: 'Local Produce Co' },
    { name: 'Green Beans',          category: 'produce',  unit: 'lb',  costPrice: 2.40, parLevel: 15, reorderThreshold: 6,  caseSize: 10, leadTimeDays: 1, initialStock: 10, vendor: 'Local Produce Co' },

    // Pantry
    { name: 'Vegetable Oil',        category: 'pantry',   unit: 'gal', costPrice: 12.00, parLevel: 4, reorderThreshold: 1,  caseSize: 1,  leadTimeDays: 2, initialStock: 3, vendor: 'US Foods' },
    { name: 'Granulated Sugar',     category: 'pantry',   unit: 'lb',  costPrice: 0.85, parLevel: 25, reorderThreshold: 10, caseSize: 25, leadTimeDays: 2, initialStock: 20, vendor: 'US Foods' },
    { name: 'Salt',                 category: 'pantry',   unit: 'lb',  costPrice: 0.50, parLevel: 10, reorderThreshold: 4,  caseSize: 10, leadTimeDays: 2, initialStock: 8, vendor: 'US Foods' },
    { name: 'Black Pepper',         category: 'pantry',   unit: 'oz',  costPrice: 0.85, parLevel: 16, reorderThreshold: 4,  caseSize: 16, leadTimeDays: 2, initialStock: 12, vendor: 'US Foods' },
    { name: 'Tomato Sauce',         category: 'pantry',   unit: 'oz',  costPrice: 0.10, parLevel: 240, reorderThreshold: 96, caseSize: 240, leadTimeDays: 2, initialStock: 144, vendor: 'US Foods' },
    { name: 'Coffee (ground)',      category: 'beverage', unit: 'lb',  costPrice: 8.20, parLevel: 8, reorderThreshold: 3,  caseSize: 6,  leadTimeDays: 2, initialStock: 5, vendor: 'US Foods' },
];

const MENU_ITEMS: SeedMenuItem[] = [
    {
        name: 'Classic Meatloaf',
        category: 'entree',
        description: 'Ground beef meatloaf with onion and tomato glaze.',
        defaultServings: 30,
        recipes: [
            { productName: 'Ground Beef 80/20', qtyPerServing: 0.30,  unit: 'lb' },
            { productName: 'Yellow Onions',     qtyPerServing: 0.05,  unit: 'lb' },
            { productName: 'Eggs',              qtyPerServing: 0.10,  unit: 'ea' },
            { productName: 'Bread (white loaf)',qtyPerServing: 0.05,  unit: 'ea' },
            { productName: 'Tomato Sauce',      qtyPerServing: 1.5,   unit: 'oz' },
            { productName: 'Salt',              qtyPerServing: 0.01,  unit: 'lb' },
        ],
    },
    {
        name: 'Roasted Chicken Breast',
        category: 'entree',
        description: 'Oven-roasted chicken breast, lightly seasoned.',
        defaultServings: 30,
        recipes: [
            { productName: 'Chicken Breast',    qtyPerServing: 0.40,  unit: 'lb' },
            { productName: 'Vegetable Oil',     qtyPerServing: 0.005, unit: 'gal' },
            { productName: 'Salt',              qtyPerServing: 0.005, unit: 'lb' },
            { productName: 'Black Pepper',      qtyPerServing: 0.05,  unit: 'oz' },
        ],
    },
    {
        name: 'Baked Cod with Lemon',
        category: 'entree',
        description: 'Light baked cod fillet, seasoned and butter-finished.',
        defaultServings: 25,
        recipes: [
            { productName: 'Cod Fillet',        qtyPerServing: 0.35,  unit: 'lb' },
            { productName: 'Butter',            qtyPerServing: 0.03,  unit: 'lb' },
            { productName: 'Salt',              qtyPerServing: 0.005, unit: 'lb' },
        ],
    },
    {
        name: 'Spaghetti Bolognese',
        category: 'entree',
        description: 'Penne pasta with beef-and-tomato sauce.',
        defaultServings: 30,
        recipes: [
            { productName: 'Pasta (penne)',     qtyPerServing: 0.20,  unit: 'lb' },
            { productName: 'Ground Beef 80/20', qtyPerServing: 0.20,  unit: 'lb' },
            { productName: 'Tomato Sauce',      qtyPerServing: 4,     unit: 'oz' },
            { productName: 'Yellow Onions',     qtyPerServing: 0.05,  unit: 'lb' },
            { productName: 'Salt',              qtyPerServing: 0.005, unit: 'lb' },
        ],
    },
    {
        name: 'Garden Salad',
        category: 'side',
        description: 'Lettuce, tomato, and shredded carrot.',
        defaultServings: 30,
        recipes: [
            { productName: 'Lettuce (head)',    qtyPerServing: 0.15,  unit: 'ea' },
            { productName: 'Tomatoes',          qtyPerServing: 0.10,  unit: 'lb' },
            { productName: 'Carrots',           qtyPerServing: 0.05,  unit: 'lb' },
        ],
    },
    {
        name: 'Mashed Potatoes',
        category: 'side',
        description: 'Buttery mashed russet potatoes.',
        defaultServings: 30,
        recipes: [
            { productName: 'Potatoes (russet)', qtyPerServing: 0.45,  unit: 'lb' },
            { productName: 'Butter',            qtyPerServing: 0.04,  unit: 'lb' },
            { productName: 'Milk (gallon)',     qtyPerServing: 0.02,  unit: 'gal' },
            { productName: 'Salt',              qtyPerServing: 0.005, unit: 'lb' },
        ],
    },
    {
        name: 'Steamed Green Beans',
        category: 'side',
        description: 'Lightly buttered green beans.',
        defaultServings: 30,
        recipes: [
            { productName: 'Green Beans',       qtyPerServing: 0.20,  unit: 'lb' },
            { productName: 'Butter',            qtyPerServing: 0.02,  unit: 'lb' },
            { productName: 'Salt',              qtyPerServing: 0.003, unit: 'lb' },
        ],
    },
    {
        name: 'Scrambled Eggs & Bacon',
        category: 'breakfast',
        description: 'Two-egg scramble with two bacon strips.',
        defaultServings: 35,
        recipes: [
            { productName: 'Eggs',              qtyPerServing: 2,     unit: 'ea' },
            { productName: 'Bacon',             qtyPerServing: 0.10,  unit: 'lb' },
            { productName: 'Butter',            qtyPerServing: 0.01,  unit: 'lb' },
            { productName: 'Salt',              qtyPerServing: 0.002, unit: 'lb' },
        ],
    },
    {
        name: 'Apple Crumble',
        category: 'dessert',
        description: 'Baked apples with a sweet flour-and-butter crumble.',
        defaultServings: 30,
        recipes: [
            { productName: 'Apples',            qtyPerServing: 0.30,  unit: 'lb' },
            { productName: 'All-Purpose Flour', qtyPerServing: 0.08,  unit: 'lb' },
            { productName: 'Granulated Sugar', qtyPerServing: 0.05,  unit: 'lb' },
            { productName: 'Butter',            qtyPerServing: 0.04,  unit: 'lb' },
        ],
    },
    {
        name: 'Coffee Service',
        category: 'beverage',
        description: 'Per-cup coffee service for meals.',
        defaultServings: 60,
        recipes: [
            { productName: 'Coffee (ground)',   qtyPerServing: 0.025, unit: 'lb' },
            { productName: 'Milk (gallon)',     qtyPerServing: 0.005, unit: 'gal' },
            { productName: 'Granulated Sugar', qtyPerServing: 0.01,  unit: 'lb' },
        ],
    },
];

export interface StarterPackResult {
    vendorsCreated: number;
    vendorsReused: number;
    productsCreated: number;
    productsReused: number;
    menuItemsCreated: number;
    menuItemsReused: number;
    recipesCreated: number;
}

/**
 * Idempotent starter-pack seeder.
 * Looks up by (storeId, name) — anything that already exists is reused.
 */
export async function seedKitchenStarterPack(storeId: string): Promise<StarterPackResult> {
    const result: StarterPackResult = {
        vendorsCreated: 0, vendorsReused: 0,
        productsCreated: 0, productsReused: 0,
        menuItemsCreated: 0, menuItemsReused: 0,
        recipesCreated: 0,
    };

    // 1. Vendors
    const vendorByName = new Map<string, { id: string }>();
    for (const v of VENDORS) {
        let row = await prisma.vendor.findFirst({ where: { storeId, name: v.name } });
        if (row) {
            result.vendorsReused++;
        } else {
            row = await prisma.vendor.create({
                data: {
                    storeId,
                    name: v.name,
                    contactEmail: v.contactEmail,
                    leadTimeDays: v.leadTimeDays,
                    minOrderValue: v.minOrderValue,
                    autoSendEnabled: false, // Always false — manager reviews first orders
                },
            });
            result.vendorsCreated++;
        }
        vendorByName.set(v.name, { id: row.id });
    }

    // 2. Ingredients (Products)
    const productByName = new Map<string, { id: string }>();
    for (const ing of INGREDIENTS) {
        const vendor = vendorByName.get(ing.vendor);
        let row = await prisma.product.findFirst({ where: { storeId, name: ing.name } });
        if (row) {
            result.productsReused++;
            // Patch in kitchen fields if missing
            await prisma.product.update({
                where: { id: row.id },
                data: {
                    unit: row.unit ?? ing.unit,
                    parLevel: row.parLevel ?? ing.parLevel,
                    reorderThreshold: row.reorderThreshold ?? ing.reorderThreshold,
                    caseSize: row.caseSize ?? ing.caseSize,
                    leadTimeDays: row.leadTimeDays ?? ing.leadTimeDays,
                    vendorRefId: row.vendorRefId ?? vendor?.id ?? null,
                    vendor: row.vendor ?? ing.vendor,
                },
            });
        } else {
            row = await prisma.product.create({
                data: {
                    storeId,
                    name: ing.name,
                    category: ing.category,
                    vendor: ing.vendor,
                    vendorRefId: vendor?.id ?? null,
                    costPrice: ing.costPrice,
                    sellingPrice: 0,
                    isActive: true,
                    isConfirmed: true,
                    initialStock: ing.initialStock,
                    unit: ing.unit,
                    parLevel: ing.parLevel,
                    reorderThreshold: ing.reorderThreshold,
                    caseSize: ing.caseSize,
                    leadTimeDays: ing.leadTimeDays,
                },
            });
            // Seed an initial inventory snapshot so forecasting has on-hand to subtract
            await prisma.inventorySnapshot.create({
                data: { storeId, productId: row.id, quantityOnHand: ing.initialStock },
            });
            result.productsCreated++;
        }
        productByName.set(ing.name, { id: row.id });
    }

    // 3. Menu items + recipes
    for (const m of MENU_ITEMS) {
        let menuItem = await prisma.menuItem.findFirst({ where: { storeId, name: m.name } });
        if (menuItem) {
            result.menuItemsReused++;
            continue; // Don't overwrite existing recipes
        }
        menuItem = await prisma.menuItem.create({
            data: {
                storeId,
                name: m.name,
                category: m.category,
                description: m.description,
                defaultServings: m.defaultServings,
            },
        });
        result.menuItemsCreated++;

        for (const r of m.recipes) {
            const product = productByName.get(r.productName);
            if (!product) continue; // Skip if ingredient missing
            await prisma.recipe.create({
                data: {
                    menuItemId: menuItem.id,
                    productId: product.id,
                    qtyPerServing: r.qtyPerServing,
                    unit: r.unit,
                },
            });
            result.recipesCreated++;
        }
    }

    return result;
}
