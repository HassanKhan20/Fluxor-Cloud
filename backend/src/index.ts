import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import salesRoutes from './routes/salesRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import aiRoutes from './routes/aiRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import alertsRoutes from './routes/alertsRoutes';
import vendorRoutes from './routes/vendorRoutes';
import staffRoutes from './routes/staffRoutes';
import reorderRoutes from './routes/reorderRoutes';
import kitchenRoutes from './routes/kitchenRoutes';
import retirementRoutes from './routes/retirementRoutes';
import aiAssistantRoutes from './routes/aiAssistantRoutes';
import scanDataRoutes from './routes/scanDataRoutes';
import cycleCountRoutes from './routes/cycleCountRoutes';
import { runWeeklyForecastForAllStores } from './services/kitchenForecastService';
import { sendPurchaseOrderEmail } from './services/kitchenEmailService';
import { prisma } from './lib/prisma';
import { generateAlertsForStore } from './controllers/alertsController';
import { sendDemoRequestNotification } from './services/emailService';
import bcrypt from 'bcryptjs';

dotenv.config();

// ── Startup: verify required environment variables are set ──────────────────
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

// Warn if JWT_SECRET looks like a dev placeholder
const jwtSecret = process.env.JWT_SECRET!;
if (jwtSecret.length < 32 || ['secret', 'dev-secret', 'dev-secret-123', 'changeme'].includes(jwtSecret)) {
    console.error('[FATAL] JWT_SECRET is too weak or is a known insecure default. Set a strong random secret (min 32 chars).');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Render runs behind a reverse proxy — Express needs to trust it for rate limiting to work
app.set('trust proxy', 1);

// ── Security headers via Helmet ─────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
}));

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOriginsRaw = [
    process.env.FRONTEND_URL,
    ...(isProduction ? [] : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']),
    'https://fluxorcloud.com',
    'https://www.fluxorcloud.com',
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (health checks, server-to-server, Render health pinger)
        if (!origin) return callback(null, true);
        if (allowedOriginsRaw.includes(origin)) return callback(null, true);
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many auth attempts, please try again later.' }
});

// Stricter limit for AI endpoints — prevents abuse and unexpected API costs
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many AI requests, please slow down.' }
});

// ── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));   // Reduced from 10mb — file uploads use multipart
app.use('/api', generalLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reorder', reorderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/retirement', retirementRoutes);
app.use('/api/ai-assistant', aiLimiter, aiAssistantRoutes);
app.use('/api/scan-data', scanDataRoutes);
app.use('/api/cycle-count', cycleCountRoutes);

// ── Public: Demo request (no auth — landing page form) ───────────────────────
app.post('/api/demo-request', authLimiter, async (req, res) => {
    const { email, name, storeName } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Valid email is required' });
    }
    await sendDemoRequestNotification(email.trim(), name?.trim(), storeName?.trim());
    res.json({ message: 'Demo request received. We will reach out within 24 hours.' });
});

// ── Demo seed: populate demo account with fake data for demo video ───────────
app.post('/api/demo-seed', async (req, res) => {
    const { email, password } = req.body;
    const demoEmail = process.env.DEMO_EMAIL || 'demo@fluxor.cloud';
    if (email !== demoEmail) return res.status(403).json({ message: 'Only demo account can be seeded' });

    try {
        // Find or create demo user
        let user = await prisma.user.findUnique({ where: { email: demoEmail } });
        if (!user) {
            const hashedPassword = await bcrypt.hash(password || 'FluxorDemo2024!', 12);
            user = await prisma.user.create({ data: { name: 'Demo User', email: demoEmail, password: hashedPassword, role: 'OWNER' } });
        }
        let membership = await prisma.storeMembership.findFirst({ where: { userId: user.id } });
        let storeId: string;
        if (!membership) {
            const store = await prisma.store.create({ data: { name: 'Quick Stop Market', address: '4605 Main St, Dallas TX 75201', timezone: 'America/Chicago', defaultCurrency: 'USD' } });
            await prisma.storeMembership.create({ data: { userId: user.id, storeId: store.id, role: 'OWNER' } });
            storeId = store.id;
        } else {
            storeId = membership.storeId;
        }

        // Seed staff
        const staffData = [
            { name: 'Maria Garcia', role: 'SUPERVISOR', phone: '214-555-0101', email: 'maria@quickstop.com' },
            { name: 'James Wilson', role: 'CASHIER', phone: '214-555-0102', email: 'james@quickstop.com' },
            { name: 'Aisha Patel', role: 'CASHIER', phone: '214-555-0103', email: 'aisha@quickstop.com' },
            { name: 'Carlos Rivera', role: 'CASHIER', phone: '214-555-0104', email: 'carlos@quickstop.com' },
        ];
        for (const s of staffData) {
            const exists = await prisma.staff.findFirst({ where: { storeId, name: s.name } });
            if (!exists) {
                const staff = await prisma.staff.create({ data: { storeId, ...s, isActive: true, hireDate: new Date('2025-06-15') } });
                // Create shifts for last 7 days
                for (let d = 0; d < 7; d++) {
                    const day = new Date(); day.setDate(day.getDate() - d);
                    const start = new Date(day); start.setHours(8 + Math.floor(Math.random() * 4), 0, 0);
                    const end = new Date(start); end.setHours(start.getHours() + 8);
                    await prisma.shift.create({ data: { storeId, staffId: staff.id, startTime: start, endTime: end, salesTotal: 200 + Math.random() * 500 } });
                }
            }
        }

        // Seed weekly summary
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
        const weekEnd = new Date();
        const existingSummary = await prisma.weeklySummary.findFirst({ where: { storeId, weekStart: { gte: weekStart } } });
        if (!existingSummary) {
            await prisma.weeklySummary.create({
                data: {
                    storeId,
                    weekStart,
                    weekEnd,
                    revenue: 4285.50,
                    revenueChange: 12.3,
                    totalWasted: 340.00,
                    wastedDeadStock: 120.00,
                    wastedOverstock: 85.00,
                    wastedSlowMovers: 95.00,
                    wastedShrinkage: 40.00,
                    primaryWasteReason: 'Dead stock in Candy category',
                    topProductName: 'Red Bull 12oz',
                    topProductRevenue: 478.50,
                    worstPerformerName: 'Swedish Fish',
                    worstPerformerType: 'product',
                    worstPerformerReason: 'Only 3 units sold this week',
                    recommendations: JSON.stringify([
                        'Red Bull and Monster are your top sellers — consider a bulk deal with your distributor.',
                        'Swedish Fish and Mike and Ike are slow movers — try a 2-for-1 promo or move to checkout counter.',
                        'Tobacco sales are steady — maintain current stock levels.',
                        'Weekend alcohol sales spiked 25% — increase Saturday stock for Corona and Bud Light.'
                    ])
                }
            });
        }

        res.json({ message: 'Demo data seeded successfully', storeId });
    } catch (error) {
        console.error('Demo seed error:', error);
        res.status(500).json({ message: 'Failed to seed demo data' });
    }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected', timestamp: new Date() });
    } catch {
        res.status(503).json({ status: 'degraded', db: 'unreachable', timestamp: new Date() });
    }
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Unhandled Error]', err);
    const status = err.status || err.statusCode || 500;
    const message = isProduction ? 'An unexpected error occurred' : (err.message || 'Internal server error');
    res.status(status).json({ message });
});

// ── Background jobs ──────────────────────────────────────────────────────────
async function runAlertGeneration() {
    try {
        const stores = await prisma.store.findMany({ select: { id: true } });
        let total = 0;
        for (const store of stores) {
            total += await generateAlertsForStore(store.id);
        }
        if (total > 0) console.log(`[Alerts] Generated ${total} new alert(s) across ${stores.length} store(s)`);
    } catch (err) {
        console.error('[Alerts] Background generation failed:', err);
    }
}

// ── Kitchen weekly forecast cron ────────────────────────────────────────────
// Generates draft POs for every kitchen-mode store, then sends emails for
// vendors whose autoSendEnabled flag is set. Manager review the rest.
async function runKitchenWeeklyJob() {
    try {
        const result = await runWeeklyForecastForAllStores();
        console.log(`[Kitchen] Forecast: ${result.draftsCreated} draft PO(s) across ${result.storesProcessed} store(s)`);
        if (result.errors.length > 0) console.error('[Kitchen] Errors:', result.errors);

        // Auto-send for vendors flagged as auto-send eligible
        const eligible = await prisma.purchaseOrder.findMany({
            where: { status: 'DRAFT', vendor: { autoSendEnabled: true } },
            select: { id: true },
        });
        for (const po of eligible) {
            await sendPurchaseOrderEmail(po.id, 'system');
        }
        if (eligible.length > 0) console.log(`[Kitchen] Auto-sent ${eligible.length} PO(s) to auto-eligible vendors`);
    } catch (err) {
        console.error('[Kitchen] Weekly job failed:', err);
    }
}

// Lightweight scheduler: checks once an hour whether the cron window has
// arrived for any store (based on weeklyOrderDay) and fires the job.
let lastKitchenRunTs = 0;
async function maybeRunKitchenJob() {
    try {
        const now = new Date();
        // Run once per hour, only on the hour matching 18:00 UTC (Sunday-ish for North America).
        // For multi-tenant timezone correctness in production, swap for a cron service.
        if (now.getUTCHours() !== 18) return;
        if (Date.now() - lastKitchenRunTs < 23 * 60 * 60 * 1000) return; // throttle: at most once per day

        const dow = now.getUTCDay();
        const storesDue = await prisma.store.count({
            where: { kitchenMode: true, weeklyOrderDay: dow },
        });
        if (storesDue === 0) return;
        lastKitchenRunTs = Date.now();
        await runKitchenWeeklyJob();
    } catch (err) {
        console.error('[Kitchen] Scheduler check failed:', err);
    }
}

// ── Demo account seeding (reads password from env) ───────────────────────────
async function seedDemoAccount() {
    const demoEmail = process.env.DEMO_EMAIL;
    const demoPassword = process.env.DEMO_PASSWORD;

    if (!demoEmail || !demoPassword) return; // No demo account if env vars not set

    try {
        const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
        if (existing) return;

        const hashedPassword = await bcrypt.hash(demoPassword, 12);
        await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: { name: 'Demo User', email: demoEmail, password: hashedPassword, role: 'OWNER' },
            });
            const store = await tx.store.create({
                data: { name: 'Demo Store', address: '123 Demo Street', timezone: 'UTC', defaultCurrency: 'USD' },
            });
            await tx.storeMembership.create({
                data: { userId: user.id, storeId: store.id, role: 'OWNER' },
            });
        });
        console.log(`[Seed] Demo account created (${demoEmail})`);
    } catch (err) {
        console.error('[Seed] Failed to create demo account:', err);
    }
}

const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await seedDemoAccount();
    await runAlertGeneration();
    setInterval(runAlertGeneration, 60 * 60 * 1000);
    setInterval(maybeRunKitchenJob, 60 * 60 * 1000);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export { app, server };
