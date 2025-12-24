import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import salesRoutes from './routes/salesRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import aiRoutes from './routes/aiRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// AI routes FIRST for debugging
console.log('Registering AI routes...');
app.use('/api/ai', aiRoutes);
console.log('AI routes registered');

// Inline test route
app.get('/api/ai-test', (req, res) => {
  res.json({ status: 'AI test working' });
});

// Other routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Force keep-alive - this should NOT be necessary but fixing an edge case
setInterval(() => { }, 1 << 30); // ~12 days

// Keep process alive
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server };
