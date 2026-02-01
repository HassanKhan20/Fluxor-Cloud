import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database with sample data for Priority 1 features...\n');

    // 1. Create a test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'demo@fluxor.cloud' },
        update: {},
        create: {
            name: 'Demo User',
            email: 'demo@fluxor.cloud',
            password: hashedPassword,
            role: 'OWNER',
        },
    });
    console.log('✅ Created demo user: demo@fluxor.cloud / test123');

    // 2. Create a test store
    const store = await prisma.store.upsert({
        where: { id: 'demo-store-001' },
        update: {},
        create: {
            id: 'demo-store-001',
            name: 'Demo Convenience Store',
            address: '123 Main Street, Downtown',
            timezone: 'America/Chicago',
            defaultCurrency: 'USD',
        },
    });
    console.log('✅ Created demo store:', store.name);

    // 3. Create store membership
    await prisma.storeMembership.upsert({
        where: { storeId_userId: { storeId: store.id, userId: user.id } },
        update: {},
        create: {
            storeId: store.id,
            userId: user.id,
            role: 'OWNER',
        },
    });
    console.log('✅ Linked user to store');

    // 4. Create products with different vendors and scenarios
    const vendors = ['Coca-Cola', 'PepsiCo', 'Frito-Lay', 'Mars Inc', 'Nestle', 'Local Bakery'];

    const productsData = [
        // TOP PERFORMERS (Good sales, good margins)
        { name: 'Coca-Cola 500ml', sku: 'CC-500', vendor: 'Coca-Cola', category: 'Beverages', costPrice: 0.75, sellingPrice: 1.99, initialStock: 200, salesQty: 150 },
        { name: 'Pepsi 500ml', sku: 'PP-500', vendor: 'PepsiCo', category: 'Beverages', costPrice: 0.70, sellingPrice: 1.89, initialStock: 180, salesQty: 120 },
        { name: 'Doritos Nacho Cheese', sku: 'DOR-NC', vendor: 'Frito-Lay', category: 'Snacks', costPrice: 1.20, sellingPrice: 3.49, initialStock: 100, salesQty: 85 },
        { name: 'Snickers Bar', sku: 'SNK-01', vendor: 'Mars Inc', category: 'Candy', costPrice: 0.55, sellingPrice: 1.49, initialStock: 150, salesQty: 130 },

        // LOW STOCK (Critical alerts)
        { name: 'Red Bull 250ml', sku: 'RB-250', vendor: 'Red Bull', category: 'Energy Drinks', costPrice: 1.80, sellingPrice: 3.99, initialStock: 5, salesQty: 95 },
        { name: 'Monster Energy', sku: 'MON-16', vendor: 'Monster', category: 'Energy Drinks', costPrice: 1.60, sellingPrice: 3.49, initialStock: 8, salesQty: 72 },

        // OVERSTOCK (Warning alerts)
        { name: 'Seasonal Pumpkin Spice Coffee', sku: 'PSC-12', vendor: 'Nestle', category: 'Beverages', costPrice: 4.50, sellingPrice: 8.99, initialStock: 250, salesQty: 15 },
        { name: 'Holiday Gift Cards - NFC', sku: 'HGC-NFC', vendor: 'Local Bakery', category: 'Gift Cards', costPrice: 2.00, sellingPrice: 5.00, initialStock: 500, salesQty: 10 },

        // DEAD STOCK (No sales in 90+ days - we'll set old dates)
        { name: 'Expired Protein Bar', sku: 'EXP-PB', vendor: 'Health Plus', category: 'Health', costPrice: 2.50, sellingPrice: 4.99, initialStock: 80, salesQty: 0, isDead: true },
        { name: 'Discontinued Flavor Chips', sku: 'DIS-FC', vendor: 'Frito-Lay', category: 'Snacks', costPrice: 1.50, sellingPrice: 3.29, initialStock: 120, salesQty: 0, isDead: true },

        // SLOW MOVERS (Low velocity)
        { name: 'Premium Olive Oil', sku: 'POO-500', vendor: 'Local Bakery', category: 'Grocery', costPrice: 8.00, sellingPrice: 14.99, initialStock: 40, salesQty: 3 },
        { name: 'Organic Honey Jar', sku: 'ORG-HON', vendor: 'Local Bakery', category: 'Grocery', costPrice: 6.50, sellingPrice: 12.99, initialStock: 35, salesQty: 5 },

        // PRICING RISK (Low margin products)
        { name: 'Milk 1 Gallon', sku: 'MLK-1G', vendor: 'Dairy Fresh', category: 'Dairy', costPrice: 3.20, sellingPrice: 3.49, initialStock: 50, salesQty: 45 },
        { name: 'Bread White Loaf', sku: 'BRD-WH', vendor: 'Local Bakery', category: 'Bakery', costPrice: 1.80, sellingPrice: 1.99, initialStock: 30, salesQty: 28 },

        // VENDOR PERFORMANCE MIX (to create vendor scorecards)
        { name: 'Lay\'s Classic Chips', sku: 'LAY-CL', vendor: 'Frito-Lay', category: 'Snacks', costPrice: 1.10, sellingPrice: 2.99, initialStock: 90, salesQty: 70 },
        { name: 'Cheetos Flamin Hot', sku: 'CHE-FH', vendor: 'Frito-Lay', category: 'Snacks', costPrice: 1.15, sellingPrice: 3.29, initialStock: 75, salesQty: 55 },
        { name: 'KitKat Bar', sku: 'KIT-01', vendor: 'Nestle', category: 'Candy', costPrice: 0.60, sellingPrice: 1.29, initialStock: 120, salesQty: 80 },
        { name: 'Nescafe Instant Coffee', sku: 'NES-IC', vendor: 'Nestle', category: 'Beverages', costPrice: 5.50, sellingPrice: 9.99, initialStock: 45, salesQty: 25 },
        { name: 'Twix Bar', sku: 'TWX-01', vendor: 'Mars Inc', category: 'Candy', costPrice: 0.58, sellingPrice: 1.49, initialStock: 100, salesQty: 75 },
        { name: 'M&Ms Peanut', sku: 'MMS-PN', vendor: 'Mars Inc', category: 'Candy', costPrice: 1.20, sellingPrice: 2.49, initialStock: 110, salesQty: 90 },
    ];

    console.log('\n📦 Creating products...');

    const createdProducts: any[] = [];

    for (const p of productsData) {
        const product = await prisma.product.upsert({
            where: {
                id: `prod-${p.sku}`
            },
            update: {
                name: p.name,
                vendor: p.vendor,
                costPrice: p.costPrice,
                sellingPrice: p.sellingPrice,
                initialStock: p.initialStock,
            },
            create: {
                id: `prod-${p.sku}`,
                storeId: store.id,
                name: p.name,
                sku: p.sku,
                vendor: p.vendor,
                category: p.category,
                costPrice: p.costPrice,
                sellingPrice: p.sellingPrice,
                initialStock: p.initialStock,
                isConfirmed: true,
            },
        });
        createdProducts.push({ ...product, salesQty: p.salesQty, isDead: (p as any).isDead });
        console.log(`  ✓ ${p.name} (${p.vendor})`);
    }

    // 5. Create sales for the past 30 days
    console.log('\n💰 Creating sales data...');

    const now = new Date();

    for (const product of createdProducts) {
        if (product.salesQty > 0) {
            // Distribute sales across the last 30 days
            const salesPerDay = Math.ceil(product.salesQty / 30);

            for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
                const saleDate = new Date(now);
                saleDate.setDate(saleDate.getDate() - daysAgo);

                // Random quantity 1-3 for each "sale" up to daily limit
                const qty = Math.min(salesPerDay, Math.ceil(Math.random() * 3));
                if (qty <= 0) continue;

                const lineTotal = qty * product.sellingPrice;

                const sale = await prisma.sale.create({
                    data: {
                        storeId: store.id,
                        dateTime: saleDate,
                        source: 'SEEDED_DATA',
                        totalAmount: lineTotal,
                        items: {
                            create: {
                                productId: product.id,
                                quantity: qty,
                                unitPrice: product.sellingPrice,
                                lineTotal: lineTotal,
                            },
                        },
                    },
                });
            }
        }
    }
    console.log('  ✓ Created sales for past 30 days');

    // 6. Create some sample alerts
    console.log('\n🔔 Creating sample alerts...');

    const alertsData = [
        {
            type: 'low_stock',
            priority: 'critical',
            title: 'Red Bull 250ml - Critical Stock',
            message: 'Only 5 units remaining. Based on sales velocity, will run out in 2 days.',
            action: 'Reorder immediately - suggest 100 units',
            productId: 'prod-RB-250',
        },
        {
            type: 'low_stock',
            priority: 'warning',
            title: 'Monster Energy - Low Stock',
            message: '8 units remaining. Consider reordering soon.',
            action: 'Add to next order - suggest 50 units',
            productId: 'prod-MON-16',
        },
        {
            type: 'overstock',
            priority: 'warning',
            title: 'Pumpkin Spice Coffee - Overstock Alert',
            message: '235 units remaining with only 15 sold in 30 days. Over 15 months of inventory.',
            action: 'Run clearance sale or return to vendor',
            productId: 'prod-PSC-12',
        },
        {
            type: 'vendor_drop',
            priority: 'info',
            title: 'Local Bakery - Performance Drop',
            message: 'Vendor margin dropped 15% this month compared to last month.',
            action: 'Review pricing agreement with vendor',
            vendorName: 'Local Bakery',
        },
        {
            type: 'pricing_risk',
            priority: 'warning',
            title: 'Milk 1 Gallon - Thin Margin',
            message: 'Only 9% margin on this high-velocity item. Consider price adjustment.',
            action: 'Increase price by $0.20 to improve margin',
            productId: 'prod-MLK-1G',
        },
    ];

    for (const alert of alertsData) {
        await prisma.alert.create({
            data: {
                storeId: store.id,
                ...alert,
            },
        });
    }
    console.log('  ✓ Created 5 sample alerts');

    // 7. Create a weekly summary
    console.log('\n📊 Creating weekly summary...');

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    await prisma.weeklySummary.upsert({
        where: {
            storeId_weekStart: {
                storeId: store.id,
                weekStart: weekStart,
            },
        },
        update: {},
        create: {
            storeId: store.id,
            weekStart: weekStart,
            weekEnd: weekEnd,
            revenue: 4523.87,
            revenueChange: 12.5,
            totalWasted: 1847.50,
            wastedDeadStock: 599.20,
            wastedOverstock: 845.00,
            wastedSlowMovers: 285.30,
            wastedShrinkage: 118.00,
            primaryWasteReason: 'Overstock on seasonal items',
            topProductId: 'prod-CC-500',
            topProductName: 'Coca-Cola 500ml',
            topProductRevenue: 298.50,
            worstPerformerId: 'prod-PSC-12',
            worstPerformerName: 'Seasonal Pumpkin Spice Coffee',
            worstPerformerType: 'product',
            worstPerformerReason: 'Only 15 units sold with 250 in stock',
            recommendations: JSON.stringify([
                'Run a 30% off sale on Pumpkin Spice Coffee before it expires',
                'Reorder Red Bull immediately - selling fast',
                'Contact Local Bakery about pricing concerns',
                'Consider discontinuing Holiday Gift Cards'
            ]),
        },
    });
    console.log('  ✓ Created weekly summary');

    console.log('\n✨ Seeding complete!\n');
    console.log('📌 Login credentials:');
    console.log('   Email: demo@fluxor.cloud');
    console.log('   Password: test123');
    console.log('\n🚀 You can now test all Priority 1 features!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
