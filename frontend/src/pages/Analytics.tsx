import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, Lightbulb, Package, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';

interface TrendData {
    period: string;
    amount: number;
}

interface Prediction {
    date: string;
    predicted: number;
    confidence: string;
}

interface ProductData {
    id: string;
    name: string;
    category: string | null;
    totalRevenue: number;
    totalQuantity: number;
    trend: number;
    trendDirection: string;
}

interface Insight {
    type: string;
    title: string;
    description: string;
    icon: string;
}

export default function Analytics() {
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [trendSummary, setTrendSummary] = useState<any>(null);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [predictionSummary, setPredictionSummary] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<ProductData[]>([]);
    const [trendingProducts, setTrendingProducts] = useState<ProductData[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Fetch each endpoint individually to handle partial failures
        try {
            const trendsRes = await api.get(`/analytics/trends?period=${period}`, token);
            setTrends(trendsRes?.trends || []);
            setTrendSummary(trendsRes?.summary || null);
        } catch (e) {
            console.error('Trends fetch failed:', e);
            setTrends([]);
            setTrendSummary(null);
        }

        try {
            const predictionsRes = await api.get('/analytics/predictions', token);
            setPredictions(predictionsRes?.predictions || []);
            setPredictionSummary(predictionsRes?.summary || null);
        } catch (e) {
            console.error('Predictions fetch failed:', e);
            setPredictions([]);
            setPredictionSummary(null);
        }

        try {
            const productsRes = await api.get('/analytics/top-products', token);
            setTopProducts(productsRes?.topPerformers || []);
            setTrendingProducts(productsRes?.trending || []);
        } catch (e) {
            console.error('Top products fetch failed:', e);
            setTopProducts([]);
            setTrendingProducts([]);
        }

        try {
            const insightsRes = await api.get('/analytics/insights', token);
            setInsights(insightsRes?.insights || []);
        } catch (e) {
            console.error('Insights fetch failed:', e);
            setInsights([]);
        }

        setLoading(false);
    };

    // Safe calculations - handle empty arrays
    const maxTrendValue = trends.length > 0 ? Math.max(...trends.map(t => t.amount), 1) : 1;
    const maxPredictionValue = predictions.length > 0 ? Math.max(...predictions.map(p => p.predicted), 1) : 1;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Loading analytics...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Analytics & Predictions</h1>
                        <p className="text-gray-500 mt-1">Track trends, forecast sales, and discover insights</p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-white border-0 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Revenue</p>
                                        <p className="text-2xl font-bold">${trendSummary?.totalRevenue?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <BarChart3 className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-0 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Avg Daily Sales</p>
                                        <p className="text-2xl font-bold">${trendSummary?.avgDaily?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                        <Target className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-0 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Growth Rate</p>
                                        <p className="text-2xl font-bold flex items-center gap-1">
                                            {trendSummary && trendSummary.growthRate !== null && trendSummary.growthRate !== undefined ? (
                                                <>
                                                    {trendSummary.growthRate > 0 ? <ArrowUp className="w-5 h-5 text-green-500" /> :
                                                        trendSummary.growthRate < 0 ? <ArrowDown className="w-5 h-5 text-red-500" /> : null}
                                                    {Math.abs(trendSummary.growthRate)}%
                                                </>
                                            ) : '--'}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-0 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Predicted Next Week</p>
                                        <p className="text-2xl font-bold">${predictionSummary?.predictedWeekTotal?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <Lightbulb className="w-6 h-6 text-amber-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sales Trends Chart */}
                        <Card className="bg-white border-0 shadow-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Sales Trends</CardTitle>
                                        <CardDescription>Revenue over time</CardDescription>
                                    </div>
                                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                        {(['daily', 'weekly', 'monthly'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setPeriod(p)}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${period === p ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-end gap-1 px-2">
                                    {trends.slice(-14).map((trend, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center">
                                            <div
                                                className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors"
                                                style={{ height: `${(trend.amount / maxTrendValue) * 200}px` }}
                                                title={`$${trend.amount.toLocaleString()}`}
                                            />
                                            <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">
                                                {trend.period.slice(-5)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Predictions Chart */}
                        <Card className="bg-white border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle>7-Day Forecast</CardTitle>
                                <CardDescription>Predicted sales for the next week</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {predictions.length > 0 ? (
                                    <div className="h-64 flex items-end gap-2 px-2">
                                        {predictions.map((pred, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center">
                                                <div
                                                    className="w-full bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-sm"
                                                    style={{ height: `${(pred.predicted / maxPredictionValue) * 200}px` }}
                                                    title={`$${pred.predicted.toLocaleString()}`}
                                                />
                                                <span className="text-xs text-gray-500 mt-1">{pred.date.split(' ')[0]}</span>
                                                <span className="text-xs font-medium text-gray-700">${Math.round(pred.predicted)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-400">
                                        <div className="text-center">
                                            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>Need more sales data for predictions</p>
                                        </div>
                                    </div>
                                )}
                                {predictionSummary && predictionSummary.expectedGrowth !== null && predictionSummary.expectedGrowth !== undefined && (
                                    <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-center gap-2">
                                        {predictionSummary.expectedGrowth > 0 ? (
                                            <ArrowUp className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <ArrowDown className="w-5 h-5 text-red-600" />
                                        )}
                                        <span className="text-sm">
                                            Expected {predictionSummary.expectedGrowth > 0 ? 'growth' : 'decline'} of{' '}
                                            <strong>{Math.abs(predictionSummary.expectedGrowth)}%</strong> vs last week
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Insights & Top Products Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* AI Insights */}
                        <Card className="bg-white border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-amber-500" />
                                    AI Insights
                                </CardTitle>
                                <CardDescription>Smart observations from your data</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {insights.map((insight, i) => (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-xl border-l-4 ${insight.type === 'success' ? 'bg-green-50 border-green-500' :
                                            insight.type === 'warning' ? 'bg-amber-50 border-amber-500' :
                                                'bg-blue-50 border-blue-500'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">{insight.icon}</span>
                                            <div>
                                                <p className="font-semibold text-gray-900">{insight.title}</p>
                                                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {insights.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Import more sales data to see insights</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Products */}
                        <Card className="bg-white border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-500" />
                                    Top Performing Products
                                </CardTitle>
                                <CardDescription>Best sellers from the last 30 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topProducts.map((product, i) => (
                                        <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600">
                                                    {i + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.totalQuantity} sold</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900">${product.totalRevenue.toLocaleString()}</p>
                                                <div className={`flex items-center gap-1 text-xs ${product.trendDirection === 'up' ? 'text-green-600' :
                                                    product.trendDirection === 'down' ? 'text-red-600' : 'text-gray-500'
                                                    }`}>
                                                    {product.trendDirection === 'up' ? <TrendingUp className="w-3 h-3" /> :
                                                        product.trendDirection === 'down' ? <TrendingDown className="w-3 h-3" /> :
                                                            <Minus className="w-3 h-3" />}
                                                    {Math.abs(product.trend)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {topProducts.length === 0 && (
                                        <div className="text-center py-8 text-gray-400">
                                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No product data yet</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
