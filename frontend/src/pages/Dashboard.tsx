import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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
    LogOut,
    AlertTriangle,
    CheckCircle2,
    HelpCircle,
    Info
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
            // Use mock data for demo - but with null comparisons to show honest state
            setStats({
                totalRevenue: 0,
                salesCount: 0,
                lowStockCount: 0,
                chartData: [],
                revenueChange: null,
                salesCountChange: null,
                hasInventorySetupNeeded: true,
                unmatchedCount: 0,
                avgTransaction: 0,
                productsWithoutStock: 0
            });
        } finally {
            setLoading(false);
        }
    };

    // Get time-appropriate greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Format percentage change or return null indicator
    const formatChange = (change: number | null | undefined) => {
        if (change === null || change === undefined) return null;
        const formatted = Math.abs(change).toFixed(1);
        return { value: formatted, positive: change >= 0 };
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
    const revenueChangeInfo = formatChange(stats?.revenueChange);
    const salesChangeInfo = formatChange(stats?.salesCountChange);

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
                            <h1 className="font-semibold text-gray-900">{getGreeting()} 👋</h1>
                            <p className="text-sm text-gray-500">Here's how your store is performing today</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 relative">
                            <Bell size={20} />
                            {(stats?.unmatchedCount && stats.unmatchedCount > 0) && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                            )}
                        </button>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="p-6 max-w-7xl mx-auto space-y-6">

                    {/* Inventory Setup Alert */}
                    {stats?.hasInventorySetupNeeded && stats.productsWithoutStock && stats.productsWithoutStock > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={18} className="text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-amber-900">Set up your starting inventory</p>
                                <p className="text-sm text-amber-700 mt-0.5">
                                    {stats.productsWithoutStock} products don't have starting stock set. We can't track inventory until you tell us what you have.
                                </p>
                            </div>
                            <Link to="/products">
                                <Button variant="secondary" size="sm">
                                    Set Starting Stock
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Unmatched Products Alert */}
                    {stats?.unmatchedCount && stats.unmatchedCount > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Info size={18} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-blue-900">Products need your attention</p>
                                <p className="text-sm text-blue-700 mt-0.5">
                                    {stats.unmatchedCount} unmatched products were detected from your sales import.
                                </p>
                            </div>
                            <Link to="/products">
                                <Button variant="secondary" size="sm">
                                    Review & Match
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Primary Metric */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-gray-500">Today's revenue</p>
                                    <div className="group relative">
                                        <HelpCircle size={14} className="text-gray-400 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                            Based on imported sales data
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl font-bold text-gray-900">
                                        ${stats?.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    {revenueChangeInfo ? (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${revenueChangeInfo.positive
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                            }`}>
                                            {revenueChangeInfo.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                            {revenueChangeInfo.positive ? '+' : '-'}{revenueChangeInfo.value}%
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                                            —
                                        </span>
                                    )}
                                </div>
                                {stats?.yesterdayRevenue !== undefined && stats.yesterdayRevenue > 0 ? (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Compared to ${stats.yesterdayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} yesterday
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-400 mt-2">
                                        No data from yesterday to compare
                                    </p>
                                )}
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

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Sales completed today */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Sales completed today</p>
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <BarChart3 size={16} className="text-blue-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{stats?.salesCount || 0}</p>
                            <div className="flex items-center gap-2 mt-1">
                                {salesChangeInfo ? (
                                    <span className={`text-sm ${salesChangeInfo.positive ? 'text-green-600' : 'text-red-600'}`}>
                                        {salesChangeInfo.positive ? '+' : '-'}{salesChangeInfo.value}% from yesterday
                                    </span>
                                ) : (
                                    <span className="text-sm text-gray-400">No comparison data</span>
                                )}
                            </div>
                        </div>

                        {/* Products you should restock soon */}
                        <div className={`rounded-xl p-5 shadow-sm border ${stats?.lowStockCount && stats.lowStockCount > 0
                                ? 'bg-orange-50 border-orange-200'
                                : 'bg-white border-gray-100'
                            }`}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Products you should restock soon</p>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'bg-orange-100' : 'bg-gray-100'
                                    }`}>
                                    <AlertCircle size={16} className={
                                        stats?.lowStockCount && stats.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-400'
                                    } />
                                </div>
                            </div>
                            <p className={`text-3xl font-bold ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-900'
                                }`}>
                                {stats?.lowStockCount || 0} items
                            </p>
                            {stats?.lowStockCount && stats.lowStockCount > 0 ? (
                                <Link to="/products" className="text-sm text-orange-700 font-medium mt-1 inline-flex items-center gap-1 hover:underline">
                                    View products <ChevronRight size={14} />
                                </Link>
                            ) : (
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={14} className="text-green-500" />
                                    All stocked up
                                </p>
                            )}
                        </div>

                        {/* Average spend per customer */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Average spend per customer</p>
                                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                    <TrendingUp size={16} className="text-green-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                ${stats?.avgTransaction?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">Based on today's sales</p>
                        </div>
                    </div>

                    {/* Chart + Insights Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="font-semibold text-gray-900">Revenue this week</h2>
                                    <p className="text-sm text-gray-500">Daily breakdown of your sales</p>
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
                                <div className="h-64 flex flex-col items-center justify-center text-center bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <BarChart3 size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-900 font-medium mb-1">Import sales to unlock performance insights</p>
                                    <p className="text-sm text-gray-500 mb-4">Upload your first sales data to see revenue trends</p>
                                    <Link to="/sales">
                                        <Button variant="primary" size="sm">
                                            <Upload size={16} />
                                            Import Sales Data
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* AI Insights - Premium Redesign */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 shadow-lg text-white overflow-hidden relative">
                            {/* Subtle background pattern */}
                            <div className="absolute inset-0 opacity-5">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                                        <Sparkles size={18} />
                                    </div>
                                    <h2 className="font-semibold">What Fluxor recommends today</h2>
                                </div>
                                <p className="text-slate-400 text-sm mb-6">Personalized insights based on your store data</p>

                                <div className="space-y-4">
                                    {/* Dynamic Insight based on data */}
                                    {hasData && revenueChangeInfo && revenueChangeInfo.positive && (
                                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <TrendingUp size={16} className="text-green-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm mb-1">Your store is doing well</p>
                                                    <p className="text-slate-300 text-sm leading-relaxed">
                                                        Revenue is up {revenueChangeInfo.value}% compared to yesterday. Keep the momentum going by ensuring your popular items stay in stock.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Low Stock Insight */}
                                    {stats?.lowStockCount && stats.lowStockCount > 0 && (
                                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <AlertCircle size={16} className="text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm mb-1">Restock before the weekend</p>
                                                    <p className="text-slate-300 text-sm leading-relaxed">
                                                        {stats.lowStockCount} products are running low. Consider restocking before your next busy period to avoid lost sales.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Getting Started Insight - when no data */}
                                    {!hasData && (
                                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Upload size={16} className="text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm mb-1">Let's get started</p>
                                                    <p className="text-slate-300 text-sm leading-relaxed">
                                                        Import your sales data and I'll start providing personalized recommendations to help grow your business.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Inventory Setup Insight */}
                                    {stats?.hasInventorySetupNeeded && (
                                        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Package size={16} className="text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm mb-1">Complete your setup</p>
                                                    <p className="text-slate-300 text-sm leading-relaxed">
                                                        Set your starting inventory so I can track stock levels and alert you before items run out.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm font-medium transition-all hover:border-white/20">
                                    Ask Fluxor AI anything...
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
