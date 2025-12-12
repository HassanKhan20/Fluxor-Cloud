import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    AlertCircle,
    Package,
    Sparkles,
    ChevronRight,
    Upload,
    BarChart3,
    Menu,
    Bell,
    Settings,
    LogOut
} from 'lucide-react';
import type { DashboardStats } from '@/types';
import Button from '@/components/Button';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/dashboard/stats', token || '');
            setStats(data);
        } catch (error) {
            // Use mock data for demo
            setStats({
                totalRevenue: 24892.50,
                salesCount: 847,
                lowStockCount: 3,
                chartData: [
                    { date: 'Mon', amount: 3200 },
                    { date: 'Tue', amount: 4100 },
                    { date: 'Wed', amount: 3800 },
                    { date: 'Thu', amount: 5200 },
                    { date: 'Fri', amount: 4800 },
                    { date: 'Sat', amount: 6100 },
                    { date: 'Sun', amount: 4500 },
                ],
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const hasData = stats && stats.chartData && stats.chartData.length > 0;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">F</span>
                        </div>
                        {sidebarOpen && <span className="font-semibold text-gray-900">Fluxor</span>}
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { icon: <BarChart3 size={20} />, label: 'Dashboard', path: '/dashboard', active: true },
                        { icon: <Package size={20} />, label: 'Products', path: '/products', active: false },
                        { icon: <Upload size={20} />, label: 'Import Sales', path: '/sales', active: false },
                        { icon: <TrendingUp size={20} />, label: 'Invoices', path: '/invoices', active: false },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.active
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {item.icon}
                            {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="p-4 border-t border-gray-100 space-y-1">
                    <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50">
                        <Settings size={20} />
                        {sidebarOpen && <span className="font-medium text-sm">Settings</span>}
                    </Link>
                    <button
                        onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="font-medium text-sm">Sign out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="font-semibold text-gray-900">Good morning 👋</h1>
                            <p className="text-sm text-gray-500">Here's how your store is performing</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Primary Metric */}
                    <div className="mb-8">
                        <div className="bg-white rounded-2xl p-8 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Today's revenue</p>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-5xl font-bold text-gray-900">${stats?.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                                            <ArrowUpRight size={14} />
                                            +12.5%
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">Compared to $22,145 yesterday</p>
                                </div>
                                <div className="flex gap-3">
                                    <Link to="/sales">
                                        <Button variant="secondary" size="md">
                                            <Upload size={18} />
                                            Import Sales
                                        </Button>
                                    </Link>
                                    <Link to="/products">
                                        <Button variant="primary" size="md">
                                            <Package size={18} />
                                            Manage Inventory
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Transactions */}
                        <div className="bg-white rounded-xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Transactions today</p>
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <BarChart3 size={16} className="text-blue-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{stats?.salesCount}</p>
                            <p className="text-sm text-gray-500 mt-1">+8% from yesterday</p>
                        </div>

                        {/* Products needing attention */}
                        <div className={`rounded-xl p-5 shadow-sm ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'bg-orange-50' : 'bg-white'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Need restocking</p>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                                    <AlertCircle size={16} className={stats?.lowStockCount && stats.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-400'} />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                                {stats?.lowStockCount} items
                            </p>
                            {stats?.lowStockCount && stats.lowStockCount > 0 ? (
                                <Link to="/products" className="text-sm text-orange-700 font-medium mt-1 inline-flex items-center gap-1 hover:underline">
                                    View products <ChevronRight size={14} />
                                </Link>
                            ) : (
                                <p className="text-sm text-gray-500 mt-1">All stocked up ✓</p>
                            )}
                        </div>

                        {/* Average order */}
                        <div className="bg-white rounded-xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Avg. transaction</p>
                                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                    <TrendingUp size={16} className="text-green-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                ${stats?.salesCount ? (stats.totalRevenue / stats.salesCount).toFixed(2) : '0.00'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Per customer</p>
                        </div>
                    </div>

                    {/* Chart + Insights Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="font-semibold text-gray-900">Revenue this week</h2>
                                    <p className="text-sm text-gray-500">Daily breakdown of your sales</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="inline-flex items-center gap-1.5 text-green-600">
                                        <ArrowUpRight size={14} />
                                        +18% vs last week
                                    </span>
                                </div>
                            </div>

                            {hasData ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.chartData}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="date"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#9CA3AF' }}
                                            />
                                            <YAxis
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#9CA3AF' }}
                                                tickFormatter={(value) => `$${value}`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                }}
                                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="amount"
                                                stroke="#3B82F6"
                                                strokeWidth={2}
                                                fill="url(#colorRevenue)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <BarChart3 size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-900 font-medium mb-1">No sales data yet</p>
                                    <p className="text-sm text-gray-500 mb-4">Import your first sales to see revenue trends</p>
                                    <Link to="/sales">
                                        <Button variant="primary" size="sm">
                                            Import Sales Data
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* AI Insights */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-sm text-white">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Sparkles size={18} />
                                </div>
                                <h2 className="font-semibold">Fluxor Insights</h2>
                            </div>
                            <p className="text-blue-100 text-sm mb-6">AI-powered recommendations based on your data</p>

                            <div className="space-y-4">
                                {/* Insight 1 */}
                                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <TrendingUp size={12} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm mb-1">Sales are trending up</p>
                                            <p className="text-blue-100 text-sm leading-relaxed">
                                                Revenue increased 15% compared to last Tuesday. Consider restocking high-demand items before the weekend.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Insight 2 */}
                                {stats?.lowStockCount && stats.lowStockCount > 0 && (
                                    <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <AlertCircle size={12} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm mb-1">Restock reminder</p>
                                                <p className="text-blue-100 text-sm leading-relaxed">
                                                    {stats.lowStockCount} products are running low. Check your inventory to avoid stockouts.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                                Ask Fluxor AI anything...
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
