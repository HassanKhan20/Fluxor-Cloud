import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, TrendingUp, AlertTriangle, Package } from 'lucide-react';
import type { DashboardStats } from '@/types';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/dashboard/stats', token || '');
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading dashboard...</div>;
    if (!stats) return <div className="p-8">Error loading dashboard.</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.location.href = '/sales'}>Import Sales</Button>
                    <Button onClick={() => window.location.href = '/products'}>Manage Inventory</Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <span className="text-muted-foreground">$</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> +12% from last week
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sales Count</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.salesCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Transactions recorded</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Items below threshold</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & AI Insights */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip />
                                    <Bar dataKey="amount" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Fluxor AI Insights</CardTitle>
                        <CardDescription>Daily operational intelligence</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg text-sm border-l-4 border-blue-500">
                            <strong>Sales Trend:</strong> Revenue is up by 15% compared to last Tuesday. Consider restocking "Cola 330ml" as demand is high.
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-sm border-l-4 border-orange-500">
                            <strong>Inventory Alert:</strong> 3 items are critically low. Check "Low Stock" section.
                        </div>
                        <Button variant="ghost" className="w-full text-xs" disabled>Ask Fluxor more...</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
