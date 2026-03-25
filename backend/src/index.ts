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
import { prisma } from './lib/prisma';
import { generateAlertsForStore } from './controllers/alertsController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS — allow frontend origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));

// Rate limiting — general API
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' }
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many auth attempts, please try again later.' }
});

app.use(express.json({ limit: '10mb' }));
app.use('/api', generalLimiter);

// Routes
app.use('/api/ai', aiRoutes);
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

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Auto-generate alerts for all stores on startup and every hour
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

const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Run once on startup, then every hour
    await runAlertGeneration();
    setInterval(runAlertGeneration, 60 * 60 * 1000);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export { app, server };
