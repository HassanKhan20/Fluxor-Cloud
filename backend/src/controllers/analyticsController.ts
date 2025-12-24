import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Helper: Get Store ID
const getStoreId = async (req: Request): Promise<string | null> => {
    // @ts-ignore
    const userId = req.user?.userId;
    if (!userId) return null;
    const membership = await prisma.storeMembership.findFirst({ where: { userId } });
    return membership?.storeId || null;
};

// Helper: Get date range bounds
const getDayBounds = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// Simple linear regression for predictions
const linearRegression = (data: number[]): { slope: number; intercept: number } => {
    const n = data.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    const xMean = (n - 1) / 2;
    const yMean = data.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (data[i] - yMean);
        denominator += (i - xMean) ** 2;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    return { slope, intercept };
};

// GET /analytics/trends - Sales trends over time
export const getTrends = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const period = (req.query.period as string) || 'daily'; // daily, weekly, monthly

        // Get all sales for the store
        const sales = await prisma.sale.findMany({
            where: { storeId },
            orderBy: { dateTime: 'asc' },
            select: { dateTime: true, totalAmount: true }
        });

        if (sales.length === 0) {
            return res.json({
                trends: [],
                summary: { totalRevenue: 0, avgDaily: 0, growthRate: null }
            });
        }

        // Group sales by period
        const grouped: Record<string, number> = {};
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        sales.forEach(sale => {
            const date = new Date(sale.dateTime);
            let key: string;

            if (period === 'weekly') {
                // Get week number
                const startOfYear = new Date(date.getFullYear(), 0, 1);
                const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
                key = `Week ${weekNum}`;
            } else if (period === 'monthly') {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            } else {
                // Daily - last 30 days
                key = date.toISOString().split('T')[0];
            }

            grouped[key] = (grouped[key] || 0) + sale.totalAmount;
        });

        const trends = Object.entries(grouped)
            .slice(-30) // Last 30 data points
            .map(([period, amount]) => ({ period, amount: Math.round(amount * 100) / 100 }));

        // Calculate summary stats
        const values = trends.map(t => t.amount);
        const totalRevenue = values.reduce((a, b) => a + b, 0);
        const avgDaily = values.length > 0 ? totalRevenue / values.length : 0;

        // Calculate growth rate (compare last half vs first half)
        const mid = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid || 0;
        const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid) || 0;
        const growthRate = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : null;

        res.json({
            trends,
            summary: {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                avgDaily: Math.round(avgDaily * 100) / 100,
                growthRate: growthRate !== null ? Math.round(growthRate * 10) / 10 : null
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching trends' });
    }
};

// GET /analytics/predictions - Forecast future sales
export const getPredictions = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        // Get last 30 days of sales
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sales = await prisma.sale.findMany({
            where: { storeId, dateTime: { gte: thirtyDaysAgo } },
            orderBy: { dateTime: 'asc' },
            select: { dateTime: true, totalAmount: true }
        });

        // Group by day
        const dailySales: Record<string, number> = {};
        sales.forEach(sale => {
            const key = new Date(sale.dateTime).toISOString().split('T')[0];
            dailySales[key] = (dailySales[key] || 0) + sale.totalAmount;
        });

        const values = Object.values(dailySales);

        if (values.length < 7) {
            return res.json({
                predictions: [],
                confidence: 'low',
                message: 'Not enough historical data for predictions'
            });
        }

        // Use linear regression to predict next 7 days
        const { slope, intercept } = linearRegression(values);

        const predictions: { date: string; predicted: number; confidence: string }[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);

            const predicted = Math.max(0, intercept + slope * (values.length + i - 1));

            predictions.push({
                date: `${dayNames[futureDate.getDay()]} ${futureDate.getMonth() + 1}/${futureDate.getDate()}`,
                predicted: Math.round(predicted * 100) / 100,
                confidence: values.length >= 20 ? 'high' : 'medium'
            });
        }

        // Calculate predicted total for next week
        const predictedWeekTotal = predictions.reduce((a, b) => a + b.predicted, 0);
        const lastWeekTotal = values.slice(-7).reduce((a, b) => a + b, 0);
        const weekGrowth = lastWeekTotal > 0 ? ((predictedWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : null;

        res.json({
            predictions,
            summary: {
                predictedWeekTotal: Math.round(predictedWeekTotal * 100) / 100,
                lastWeekTotal: Math.round(lastWeekTotal * 100) / 100,
                expectedGrowth: weekGrowth !== null ? Math.round(weekGrowth * 10) / 10 : null
            },
            confidence: values.length >= 20 ? 'high' : values.length >= 10 ? 'medium' : 'low'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating predictions' });
    }
};

// GET /analytics/top-products - Best and worst performing products
export const getTopProducts = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        // Get sales with items for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const saleItems = await prisma.saleItem.findMany({
            where: {
                sale: { storeId, dateTime: { gte: thirtyDaysAgo } }
            },
            include: {
                product: { select: { id: true, name: true, category: true } },
                sale: { select: { dateTime: true } }
            }
        });

        // Aggregate by product
        const productStats: Record<string, {
            name: string;
            category: string | null;
            totalRevenue: number;
            totalQuantity: number;
            recentRevenue: number;
            olderRevenue: number;
        }> = {};

        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        saleItems.forEach(item => {
            const id = item.product.id;
            if (!productStats[id]) {
                productStats[id] = {
                    name: item.product.name,
                    category: item.product.category,
                    totalRevenue: 0,
                    totalQuantity: 0,
                    recentRevenue: 0,
                    olderRevenue: 0
                };
            }

            productStats[id].totalRevenue += item.lineTotal;
            productStats[id].totalQuantity += item.quantity;

            if (new Date(item.sale.dateTime) >= fifteenDaysAgo) {
                productStats[id].recentRevenue += item.lineTotal;
            } else {
                productStats[id].olderRevenue += item.lineTotal;
            }
        });

        // Calculate trends and sort
        const products = Object.entries(productStats)
            .map(([id, stats]) => {
                const trend = stats.olderRevenue > 0
                    ? ((stats.recentRevenue - stats.olderRevenue) / stats.olderRevenue) * 100
                    : stats.recentRevenue > 0 ? 100 : 0;

                return {
                    id,
                    name: stats.name,
                    category: stats.category,
                    totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
                    totalQuantity: stats.totalQuantity,
                    trend: Math.round(trend * 10) / 10,
                    trendDirection: trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable'
                };
            })
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        const topPerformers = products.slice(0, 5);
        const trending = [...products].sort((a, b) => b.trend - a.trend).slice(0, 5);
        const declining = [...products].sort((a, b) => a.trend - b.trend).slice(0, 5);

        res.json({
            topPerformers,
            trending,
            declining,
            totalProducts: products.length
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching product analytics' });
    }
};

// GET /analytics/insights - AI-generated insights
export const getInsights = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        // Get sales data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sales = await prisma.sale.findMany({
            where: { storeId, dateTime: { gte: thirtyDaysAgo } },
            select: { dateTime: true, totalAmount: true }
        });

        const insights: { type: string; title: string; description: string; icon: string }[] = [];

        if (sales.length === 0) {
            return res.json({ insights: [{ type: 'info', title: 'No Data', description: 'Import sales data to see insights', icon: '📊' }] });
        }

        // Day of week analysis
        const dayTotals: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        sales.forEach(sale => {
            const day = new Date(sale.dateTime).getDay();
            dayTotals[day].push(sale.totalAmount);
        });

        const dayAvgs = Object.entries(dayTotals).map(([day, amounts]) => ({
            day: parseInt(day),
            avg: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0
        })).sort((a, b) => b.avg - a.avg);

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const bestDay = dayNames[dayAvgs[0].day];
        const worstDay = dayNames[dayAvgs[dayAvgs.length - 1].day];

        insights.push({
            type: 'success',
            title: 'Best Sales Day',
            description: `${bestDay} is your best-performing day with an average of $${Math.round(dayAvgs[0].avg)}/transaction`,
            icon: '📈'
        });

        if (dayAvgs[dayAvgs.length - 1].avg > 0) {
            insights.push({
                type: 'warning',
                title: 'Growth Opportunity',
                description: `${worstDay} has the lowest sales. Consider promotions or special offers.`,
                icon: '💡'
            });
        }

        // Weekly trend
        const thisWeek = sales.filter(s => {
            const saleDate = new Date(s.dateTime);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return saleDate >= weekAgo;
        });
        const lastWeek = sales.filter(s => {
            const saleDate = new Date(s.dateTime);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            return saleDate >= twoWeeksAgo && saleDate < weekAgo;
        });

        const thisWeekTotal = thisWeek.reduce((a, b) => a + b.totalAmount, 0);
        const lastWeekTotal = lastWeek.reduce((a, b) => a + b.totalAmount, 0);

        if (lastWeekTotal > 0) {
            const weekChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
            if (weekChange > 10) {
                insights.push({
                    type: 'success',
                    title: 'Strong Week',
                    description: `Sales are up ${Math.round(weekChange)}% compared to last week. Great momentum!`,
                    icon: '🚀'
                });
            } else if (weekChange < -10) {
                insights.push({
                    type: 'warning',
                    title: 'Sales Dip',
                    description: `Sales are down ${Math.round(Math.abs(weekChange))}% from last week. Review your inventory and pricing.`,
                    icon: '📉'
                });
            }
        }

        // Transaction count insight
        const avgTransactionValue = sales.reduce((a, b) => a + b.totalAmount, 0) / sales.length;
        insights.push({
            type: 'info',
            title: 'Average Transaction',
            description: `Customers spend an average of $${Math.round(avgTransactionValue * 100) / 100} per visit`,
            icon: '💳'
        });

        res.json({ insights });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating insights' });
    }
};
