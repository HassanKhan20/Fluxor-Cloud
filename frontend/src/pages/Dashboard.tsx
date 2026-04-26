import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Package,
    ChevronRight,
    ChevronDown,
    Upload,
    BarChart3,
    CheckCircle2,
    DollarSign,
    Flag,
    Bell,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    Settings,
    Calendar,
    Clock,
    PencilLine,
    PackagePlus,
    RefreshCw,
    Tag,
    Truck,
    ShoppingCart,
    Printer,
} from 'lucide-react';
import type { DashboardStats } from '@/types';
import Button from '@/components/Button';
import DashboardLayout from '@/components/DashboardLayout';
import AlertsDropdown from '@/components/dashboard/AlertsDropdown';
import WeeklySummaryCard from '@/components/dashboard/WeeklySummaryCard';
import GlobalSearch from '@/components/GlobalSearch';

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    to?: string;
}
const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick, to }) => {
    const inner = (
        <>
            <span className="w-12 h-12 rounded-full bg-white text-indigo-700 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
                {icon}
            </span>
            <span className="text-[11px] font-medium text-white/85 group-hover:text-white tracking-tight whitespace-nowrap">
                {label}
            </span>
        </>
    );
    if (to) {
        return <Link to={to} className="flex flex-col items-center gap-2 group">{inner}</Link>;
    }
    return <button onClick={onClick} className="flex flex-col items-center gap-2 group">{inner}</button>;
};

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [inventoryHealth, setInventoryHealth] = useState<{
        slowMovers: Array<{ id: string; name: string; category: string | null; salesLast7Days: number; daysSinceLastSale: number | null }>;
        restockAlerts: Array<{ id: string; name: string; currentStock: number; daysUntilStockout: number; urgency: string }>;
        deadStock: Array<{ id: string; name: string; currentStock: number; daysSinceLastSale: number }>;
        summary: { slowMoversCount: number; restockAlertsCount: number; deadStockCount: number; criticalAlerts: number };
    } | null>(null);
    const [moneyWasted, setMoneyWasted] = useState<{
        summary: { totalWasted: number; deadStockValue: number; overstockValue: number; missedSalesValue: number; netRecoverable: number };
        insights: string[];
    } | null>(null);
    const [cashFlow, setCashFlow] = useState<{
        daily: { date: string; inflow: number; outflow: number }[];
        totalInflow: number; totalOutflow: number; netCashFlow: number;
        last7DaysNet: number; trendPercent: number;
    } | null>(null);
    const [briefing, setBriefing] = useState<{
        date: string;
        revenue: { today: number; yesterday: number; changePercent: number };
        transactions: number; lowStock: number; openFlags: number; openAlerts: number;
        bullets: { icon: string; text: string; type: 'good' | 'warning' | 'info' }[];
    } | null>(null);

    // Collapsible sections
    const [showBriefing, setShowBriefing] = useState(true);
    const [showCashFlow, setShowCashFlow] = useState(false);
    const [showInventory, setShowInventory] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchInventoryHealth();
        fetchMoneyWasted();
        fetchCashFlow();
        fetchBriefing();
        loadUserInfo();
    }, []);

    const loadUserInfo = () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) { setUserName(JSON.parse(userStr).name?.split(' ')[0] || ''); }
        } catch { /* graceful fallback */ }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/dashboard/stats', token || '');
            setStats(data);
        } catch {
            setStats({ totalRevenue: 0, salesCount: 0, lowStockCount: 0, chartData: [], revenueChange: null, salesCountChange: null, hasInventorySetupNeeded: true, unmatchedCount: 0, avgTransaction: 0, productsWithoutStock: 0 });
        } finally { setLoading(false); }
    };

    const fetchInventoryHealth = async () => {
        try { const token = localStorage.getItem('token') || ''; setInventoryHealth(await api.get('/analytics/inventory-health', token)); } catch { /* */ }
    };
    const fetchMoneyWasted = async () => {
        try { const token = localStorage.getItem('token') || ''; setMoneyWasted(await api.get('/analytics/money-wasted', token)); } catch { /* */ }
    };
    const fetchCashFlow = async () => {
        try { const token = localStorage.getItem('token') || ''; setCashFlow(await api.get('/dashboard/cash-flow', token)); } catch { /* */ }
    };
    const fetchBriefing = async () => {
        try { const token = localStorage.getItem('token') || ''; setBriefing(await api.get('/dashboard/daily-briefing', token)); } catch { /* */ }
    };

    const actionItems: { text: string; type: 'warning' | 'info'; link: string }[] = [];
    if (stats?.lowStockCount && stats.lowStockCount > 0) actionItems.push({ text: `${stats.lowStockCount} products likely to stock out soon`, type: 'warning', link: '/products' });
    if (stats?.unmatchedCount && stats.unmatchedCount > 0) actionItems.push({ text: `${stats.unmatchedCount} inventory items ready to auto-fix`, type: 'info', link: '/products' });
    if (stats?.productsWithoutStock && stats.productsWithoutStock > 0) actionItems.push({ text: `${stats.productsWithoutStock} products need starting stock`, type: 'info', link: '/products' });

    const hasData = stats && stats.chartData && stats.chartData.length > 0;

    const briefingIcon = (icon: string) => {
        const cls = 'flex-shrink-0';
        if (icon === 'trending-up') return <TrendingUp size={14} className={`${cls} text-emerald-500`} />;
        if (icon === 'trending-down') return <TrendingDown size={14} className={`${cls} text-rose-500`} />;
        if (icon === 'package') return <Package size={14} className={`${cls} text-amber-500`} />;
        if (icon === 'flag') return <Flag size={14} className={`${cls} text-amber-500`} />;
        if (icon === 'bell') return <Bell size={14} className={`${cls} text-indigo-500`} />;
        if (icon === 'file-text') return <FileText size={14} className={`${cls} text-indigo-500`} />;
        if (icon === 'check') return <CheckCircle2 size={14} className={`${cls} text-emerald-500`} />;
        return <Info size={14} className={`${cls} text-ink-400`} />;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-ink-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-ink-500 text-[13px]">Loading your dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const timeLabel = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const initials = (userName || 'U').slice(0, 1).toUpperCase();

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-ink-100/60 font-sans">
                <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">

                    {/* HERO */}
                    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-7 lg:p-9 shadow-[0_20px_50px_-20px_rgba(79,70,229,0.5)] relative overflow-hidden">
                        {/* Subtle pattern */}
                        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                            backgroundSize: '24px 24px',
                        }} />

                        {/* Top toolbar: avatar + date + search + time + edit */}
                        <div className="relative flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center text-indigo-700 font-display font-semibold text-base shadow-sm flex-shrink-0">
                                {initials}
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 text-white text-[12px] font-medium backdrop-blur-sm">
                                <Calendar className="w-3.5 h-3.5" />
                                {dateLabel}
                            </span>
                            <GlobalSearch placeholder="Search products, vendors, categories or pages" variant="light" />
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 text-white text-[12px] font-medium backdrop-blur-sm">
                                <Clock className="w-3.5 h-3.5" />
                                {timeLabel}
                            </span>
                            <div className="hidden lg:flex items-center gap-1">
                                <AlertsDropdown />
                                <Link to="/settings" className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0">
                                    <Settings className="w-4 h-4 text-white" />
                                </Link>
                            </div>
                            <button className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0">
                                <PencilLine className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Greeting */}
                        <div className="relative mt-8 lg:mt-10 max-w-2xl">
                            <h1 className="font-display text-[34px] lg:text-[42px] font-semibold text-white tracking-tightest leading-[1.05]">
                                Welcome back, {userName || 'there'}. Today's a hiring day.
                            </h1>
                            <p className="text-white/75 mt-2.5 text-[14px]">
                                Your operations hive is waiting to be organized.
                            </p>
                        </div>

                        {/* Quick remind row + action circles */}
                        <div className="relative mt-7 lg:mt-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                            <div className="flex items-center gap-2 text-white/75 text-[12.5px]">
                                <Bell className="w-3.5 h-3.5" />
                                <span>Quick remind:</span>
                                {(stats?.lowStockCount || 0) > 0 ? (
                                    <>
                                        <Link to="/products" className="text-white font-medium hover:underline">{stats?.lowStockCount} items</Link>
                                        <span>need restock review.</span>
                                    </>
                                ) : (
                                    <span className="text-white/85">All clear — no urgent restocks.</span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-end gap-x-4 gap-y-3 lg:gap-x-5">
                                <QuickAction icon={<PackagePlus className="w-5 h-5" />} label="Add Product" to="/products" />
                                <QuickAction icon={<RefreshCw className="w-5 h-5" />} label="Restock" to="/products" />
                                <QuickAction icon={<Tag className="w-5 h-5" />} label="Set Pricing" to="/products" />
                                <QuickAction icon={<Truck className="w-5 h-5" />} label="Add Vendor" to="/vendors" />
                                <QuickAction icon={<ShoppingCart className="w-5 h-5" />} label="Reorder" to="/reorder" />
                                <QuickAction icon={<Upload className="w-5 h-5" />} label="Import Sales" to="/sales" />
                                <QuickAction icon={<Printer className="w-5 h-5" />} label="Invoices" to="/invoices" />
                            </div>
                        </div>
                    </div>

                    {/* ── KPIs ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl px-5 py-4 border border-ink-200 hover:border-ink-300 transition-colors">
                            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Today's Revenue</p>
                            <p className="font-display text-[28px] font-semibold text-ink-900 tracking-tightest tabular-nums leading-none mt-2">
                                ${stats?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                            {stats?.revenueChange !== null && stats?.revenueChange !== undefined ? (
                                <div className={`flex items-center gap-1 mt-2 text-[11.5px] font-medium tabular-nums ${stats.revenueChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {stats.revenueChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                    <span>{Math.abs(stats.revenueChange).toFixed(1)}%</span>
                                    <span className="text-ink-400 font-normal ml-1">vs yesterday</span>
                                </div>
                            ) : <p className="text-[11.5px] text-ink-500 mt-2">No prior day data</p>}
                        </div>
                        <div className="bg-white rounded-2xl px-5 py-4 border border-ink-200 hover:border-ink-300 transition-colors">
                            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Transactions</p>
                            <p className="font-display text-[28px] font-semibold text-ink-900 tracking-tightest tabular-nums leading-none mt-2">{stats?.salesCount || 0}</p>
                            <p className="text-[11.5px] text-ink-500 mt-2 tabular-nums">Avg <span className="text-ink-700 font-medium">${stats?.avgTransaction?.toFixed(2) || '0.00'}</span></p>
                        </div>
                        <div className="bg-white rounded-2xl px-5 py-4 border border-ink-200 hover:border-ink-300 transition-colors">
                            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Net Cash Flow</p>
                            {cashFlow ? (
                                <>
                                    <p className={`font-display text-[28px] font-semibold tracking-tightest tabular-nums leading-none mt-2 ${cashFlow.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {cashFlow.netCashFlow >= 0 ? '+' : '−'}${Math.abs(cashFlow.netCashFlow).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                    </p>
                                    <div className="flex items-center gap-1 mt-2 text-[11.5px] font-medium tabular-nums">
                                        {cashFlow.trendPercent >= 0
                                            ? <ArrowUpRight size={12} className="text-emerald-600" />
                                            : <ArrowDownRight size={12} className="text-rose-600" />
                                        }
                                        <span className={cashFlow.trendPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                            {Math.abs(cashFlow.trendPercent)}%
                                        </span>
                                        <span className="text-ink-400 font-normal ml-1">14-day</span>
                                    </div>
                                </>
                            ) : <p className="font-display text-[28px] font-semibold text-ink-300 tabular-nums mt-2">—</p>}
                        </div>
                    </div>

                    {/* ── Today's Briefing ── */}
                    <div className="bg-white rounded-2xl border border-ink-200">
                        <button
                            onClick={() => setShowBriefing(!showBriefing)}
                            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-ink-50/60 transition-colors rounded-t-2xl"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                                    <BarChart3 size={14} />
                                </span>
                                <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">Today's Briefing</span>
                                {(actionItems.length > 0 || (briefing && briefing.bullets.length > 0)) && (
                                    <span className="font-mono text-[10.5px] font-semibold text-ink-700 bg-ink-100 px-1.5 py-0.5 rounded-full tabular-nums">
                                        {actionItems.length + (briefing?.bullets.length || 0)}
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={15} className={`text-ink-400 transition-transform ${showBriefing ? 'rotate-180' : ''}`} />
                        </button>
                        {showBriefing && (
                            <div className="px-5 pb-4 space-y-1.5 border-t border-ink-100 pt-3">
                                {briefing?.bullets.map((b, i) => (
                                    <div key={`b-${i}`} className="flex items-center gap-2.5 py-1">
                                        {briefingIcon(b.icon)}
                                        <span className="text-[13px] text-ink-700">{b.text}</span>
                                    </div>
                                ))}
                                {actionItems.map((item, i) => (
                                    <Link key={`a-${i}`} to={item.link} className="flex items-center gap-2.5 py-1.5 group rounded-lg px-1 -mx-1 hover:bg-ink-50/80 transition-colors">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                                        <span className="text-[13px] text-ink-700 group-hover:text-ink-900 transition-colors">{item.text}</span>
                                        <ChevronRight size={13} className="text-ink-300 group-hover:text-indigo-600 ml-auto" />
                                    </Link>
                                ))}
                                {actionItems.length === 0 && (!briefing || briefing.bullets.length === 0) && (
                                    <div className="flex items-center gap-2 py-2">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        <span className="text-[13px] text-ink-600">All caught up — Fluxor is monitoring your store.</span>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 pt-3">
                                    <Link to="/sales">
                                        <Button variant="secondary" size="sm" className="bg-white border-ink-200 hover:border-ink-300 hover:bg-ink-50 text-ink-700"><Upload size={13} /> Import Sales</Button>
                                    </Link>
                                    <Link to="/products">
                                        <Button variant="secondary" size="sm" className="bg-white border-ink-200 hover:border-ink-300 hover:bg-ink-50 text-ink-700"><Package size={13} /> Inventory</Button>
                                    </Link>
                                    <Link to="/reorder">
                                        <Button variant="secondary" size="sm" className="bg-white border-ink-200 hover:border-ink-300 hover:bg-ink-50 text-ink-700"><DollarSign size={13} /> Reorder</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Charts side by side ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Revenue Chart */}
                        <div className="bg-white rounded-2xl p-5 border border-ink-200">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">Revenue · 7 days</p>
                                    <h3 className="font-display text-[14px] font-semibold text-ink-900 tracking-tight mt-0.5">This Week</h3>
                                </div>
                            </div>
                            {hasData ? (
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.chartData}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
                                                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#A1A1AA' }} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#A1A1AA' }} tickFormatter={(v) => `$${v}`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E4E7', borderRadius: '10px', boxShadow: '0 4px 16px -4px rgba(15,23,42,0.08)', fontSize: 12 }}
                                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                                            />
                                            <Area type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={2} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center bg-ink-50/60 rounded-xl border border-dashed border-ink-200">
                                    <BarChart3 size={26} className="text-ink-300 mb-2" />
                                    <p className="text-[12.5px] text-ink-600">Import sales to see trends</p>
                                    <Link to="/sales" className="mt-2 text-[11.5px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline">Import Sales Data</Link>
                                </div>
                            )}
                        </div>

                        {/* Cash Flow Chart */}
                        <div className="bg-white rounded-2xl border border-ink-200">
                            <button
                                onClick={() => setShowCashFlow(!showCashFlow)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ink-50/60 transition-colors rounded-t-2xl"
                            >
                                <div>
                                    <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">Cash Flow · 14d</p>
                                    <h3 className="font-display text-[14px] font-semibold text-ink-900 tracking-tight mt-0.5">Sales vs Costs</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    {cashFlow && (
                                        <div className="flex items-center gap-1 tabular-nums">
                                            {cashFlow.trendPercent >= 0
                                                ? <ArrowUpRight size={12} className="text-emerald-600" />
                                                : <ArrowDownRight size={12} className="text-rose-600" />
                                            }
                                            <span className={`text-[11.5px] font-medium ${cashFlow.trendPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {Math.abs(cashFlow.trendPercent)}%
                                            </span>
                                        </div>
                                    )}
                                    <ChevronDown size={15} className={`text-ink-400 transition-transform ${showCashFlow ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {showCashFlow && cashFlow && (
                                <div className="px-5 pb-5 border-t border-ink-100 pt-4">
                                    <div className="grid grid-cols-3 gap-2.5 mb-4">
                                        <div className="bg-ink-50 border border-ink-200 rounded-xl p-2.5">
                                            <p className="font-mono text-[9.5px] text-ink-500 uppercase font-semibold tracking-[0.12em]">Inflow</p>
                                            <p className="text-[13.5px] font-semibold text-ink-900 tabular-nums mt-0.5">${cashFlow.totalInflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                                        </div>
                                        <div className="bg-ink-50 border border-ink-200 rounded-xl p-2.5">
                                            <p className="font-mono text-[9.5px] text-ink-500 uppercase font-semibold tracking-[0.12em]">Outflow</p>
                                            <p className="text-[13.5px] font-semibold text-ink-900 tabular-nums mt-0.5">${cashFlow.totalOutflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                                        </div>
                                        <div className="bg-ink-50 border border-ink-200 rounded-xl p-2.5">
                                            <p className="font-mono text-[9.5px] text-ink-500 uppercase font-semibold tracking-[0.12em]">7-Day Net</p>
                                            <p className={`text-[13.5px] font-semibold tabular-nums mt-0.5 ${cashFlow.last7DaysNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {cashFlow.last7DaysNet >= 0 ? '+' : ''}${cashFlow.last7DaysNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cashFlow.daily.slice(-14)} barGap={1}>
                                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#A1A1AA' }}
                                                    tickFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })} />
                                                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#A1A1AA' }} tickFormatter={(v) => `$${v}`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E4E7', borderRadius: '10px', fontSize: 12 }}
                                                    formatter={(value: number, name: string) => [`$${value.toFixed(0)}`, name === 'inflow' ? 'Sales' : 'Costs']}
                                                    labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                />
                                                <Bar dataKey="inflow" fill="#4F46E5" radius={[3, 3, 0, 0]} name="inflow" />
                                                <Bar dataKey="outflow" fill="#C7D2FE" radius={[3, 3, 0, 0]} name="outflow" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Inventory Insights ── */}
                    {(moneyWasted?.summary.totalWasted || inventoryHealth) && (
                        <div className="bg-white rounded-2xl border border-ink-200">
                            <button
                                onClick={() => setShowInventory(!showInventory)}
                                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-ink-50/60 transition-colors rounded-t-2xl"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <AlertCircle size={14} />
                                    </span>
                                    <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">Inventory Insights</span>
                                    {moneyWasted && moneyWasted.summary.totalWasted > 0 && (
                                        <span className="font-mono text-[11px] text-rose-600 font-semibold tabular-nums">
                                            ${moneyWasted.summary.totalWasted.toLocaleString('en-US', { maximumFractionDigits: 0 })} at risk
                                        </span>
                                    )}
                                </div>
                                <ChevronDown size={15} className={`text-ink-400 transition-transform ${showInventory ? 'rotate-180' : ''}`} />
                            </button>
                            {showInventory && (
                                <div className="px-5 pb-5 space-y-4 border-t border-ink-100 pt-4">
                                    {moneyWasted && moneyWasted.summary.totalWasted > 0 && (
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                                                <p className="font-mono text-[9.5px] text-rose-700 uppercase font-semibold tracking-[0.12em]">Dead Stock</p>
                                                <p className="font-display text-[16px] font-semibold text-ink-900 tabular-nums mt-1">${moneyWasted.summary.deadStockValue.toFixed(0)}</p>
                                                <p className="text-[10.5px] text-ink-500 mt-0.5">No sales 30+ days</p>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                                <p className="font-mono text-[9.5px] text-amber-700 uppercase font-semibold tracking-[0.12em]">Overstock</p>
                                                <p className="font-display text-[16px] font-semibold text-ink-900 tabular-nums mt-1">${moneyWasted.summary.overstockValue.toFixed(0)}</p>
                                                <p className="text-[10.5px] text-ink-500 mt-0.5">Excess inventory</p>
                                            </div>
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                                                <p className="font-mono text-[9.5px] text-indigo-700 uppercase font-semibold tracking-[0.12em]">Missed Sales</p>
                                                <p className="font-display text-[16px] font-semibold text-ink-900 tabular-nums mt-1">${moneyWasted.summary.missedSalesValue.toFixed(0)}</p>
                                                <p className="text-[10.5px] text-ink-500 mt-0.5">From stockouts</p>
                                            </div>
                                        </div>
                                    )}

                                    {inventoryHealth && (inventoryHealth.restockAlerts.length > 0 || inventoryHealth.slowMovers.length > 0) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {inventoryHealth.restockAlerts.length > 0 && (
                                                <div className="bg-ink-50/60 border border-ink-200 rounded-xl p-4">
                                                    <div className="flex items-center gap-1.5 mb-2.5">
                                                        <AlertCircle size={12} className="text-amber-500" />
                                                        <h4 className="font-mono text-[10.5px] font-semibold text-ink-700 uppercase tracking-[0.12em]">Restock Soon</h4>
                                                        <span className="font-mono text-[9.5px] font-semibold tabular-nums bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-auto">{inventoryHealth.summary.restockAlertsCount}</span>
                                                    </div>
                                                    <ul className="space-y-1.5">
                                                        {inventoryHealth.restockAlerts.slice(0, 4).map(item => (
                                                            <li key={item.id} className="flex items-center justify-between text-[12.5px]">
                                                                <span className="text-ink-700 truncate max-w-[65%]">{item.name}</span>
                                                                <span className={`text-[11px] font-medium tabular-nums ${item.urgency === 'critical' ? 'text-rose-600' : 'text-ink-500'}`}>
                                                                    {item.daysUntilStockout}d left
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Link to="/products" className="text-[11.5px] font-medium text-indigo-600 hover:text-indigo-700 mt-2.5 inline-flex items-center gap-0.5">
                                                        View all <ChevronRight size={11} />
                                                    </Link>
                                                </div>
                                            )}
                                            {inventoryHealth.slowMovers.length > 0 && (
                                                <div className="bg-ink-50/60 border border-ink-200 rounded-xl p-4">
                                                    <div className="flex items-center gap-1.5 mb-2.5">
                                                        <Package size={12} className="text-ink-400" />
                                                        <h4 className="font-mono text-[10.5px] font-semibold text-ink-700 uppercase tracking-[0.12em]">Slow Movers</h4>
                                                        <span className="font-mono text-[9.5px] font-semibold tabular-nums bg-ink-100 text-ink-700 px-1.5 py-0.5 rounded-full ml-auto">{inventoryHealth.summary.slowMoversCount}</span>
                                                    </div>
                                                    <ul className="space-y-1.5">
                                                        {inventoryHealth.slowMovers.slice(0, 4).map(item => (
                                                            <li key={item.id} className="flex items-center justify-between text-[12.5px]">
                                                                <span className="text-ink-700 truncate max-w-[65%]">{item.name}</span>
                                                                <span className="text-[11px] text-ink-500 tabular-nums">
                                                                    {item.daysSinceLastSale ? `${item.daysSinceLastSale}d` : 'No sales'}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Link to="/products" className="text-[11.5px] font-medium text-indigo-600 hover:text-indigo-700 mt-2.5 inline-flex items-center gap-0.5">
                                                        View all <ChevronRight size={11} />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {moneyWasted && moneyWasted.insights.length > 0 && (
                                        <p className="text-[11.5px] text-ink-500 border-t border-ink-100 pt-3 italic">{moneyWasted.insights[0]}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ROW 5: Weekly Summary ── */}
                    <WeeklySummaryCard />

                </div>
            </div>

            {/* AI Assistant — disabled for now */}
        </DashboardLayout>
    );
}
