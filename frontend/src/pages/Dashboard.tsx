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
    Bot,
    X,
    Send,
    DollarSign,
    Flag,
    Bell,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    Settings
} from 'lucide-react';
import type { DashboardStats } from '@/types';
import Button from '@/components/Button';
import DashboardLayout from '@/components/DashboardLayout';
import AlertsDropdown from '@/components/dashboard/AlertsDropdown';
import WeeklySummaryCard from '@/components/dashboard/WeeklySummaryCard';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [aiTooltipVisible, setAiTooltipVisible] = useState(true);
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

    // AI Chat state
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchInventoryHealth();
        fetchMoneyWasted();
        fetchCashFlow();
        fetchBriefing();
        loadUserInfo();
    }, []);

    const sendMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatLoading(true);
        try {
            const token = localStorage.getItem('token') || '';
            const data = await api.post('/ai/chat', { message: userMessage }, token);
            setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that request." }]);
        } finally { setChatLoading(false); }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const formatAIMessage = (content: string) => {
        return content.split('\n').map((line, i) => {
            if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
                return (
                    <div key={i} className="flex gap-2 mt-1">
                        <span className="text-blue-500">•</span>
                        <span dangerouslySetInnerHTML={{ __html: line.replace(/^[\s•\-\d.]+/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>') }} />
                    </div>
                );
            }
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
            return <p key={i} className={i > 0 ? 'mt-2' : ''} dangerouslySetInnerHTML={{ __html: formatted }} />;
        });
    };

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
        if (icon === 'trending-down') return <TrendingDown size={14} className={`${cls} text-red-500`} />;
        if (icon === 'package') return <Package size={14} className={`${cls} text-amber-500`} />;
        if (icon === 'flag') return <Flag size={14} className={`${cls} text-amber-500`} />;
        if (icon === 'bell') return <Bell size={14} className={`${cls} text-blue-500`} />;
        if (icon === 'file-text') return <FileText size={14} className={`${cls} text-blue-500`} />;
        if (icon === 'check') return <CheckCircle2 size={14} className={`${cls} text-emerald-500`} />;
        return <Info size={14} className={`${cls} text-gray-400`} />;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Loading your dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-white">
                {/* Clean Header */}
                <header className="bg-white border-b border-blue-100 sticky top-0 z-10">
                    <div className="flex items-center justify-between px-6 h-14 max-w-6xl mx-auto">
                        <h1 className="font-semibold text-gray-900 text-lg">
                            Hi{userName ? ` ${userName}` : ''} 👋
                        </h1>
                        <div className="flex items-center gap-2">
                            <AlertsDropdown />
                            <Link to="/settings" className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 transition-colors">
                                <Settings size={18} />
                            </Link>
                        </div>
                    </div>
                </header>

                <div className="px-6 py-5 max-w-6xl mx-auto space-y-5">

                    {/* ── ROW 1: 3 Compact KPI Cards ── */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                            <p className="text-xs text-blue-400 font-medium mb-1">Today's Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ${stats?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                            {stats?.revenueChange !== null && stats?.revenueChange !== undefined && (
                                <div className={`flex items-center gap-1 mt-1 ${stats.revenueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {stats.revenueChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                    <span className="text-xs font-medium">{Math.abs(stats.revenueChange).toFixed(1)}%</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                            <p className="text-xs text-blue-400 font-medium mb-1">Transactions</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.salesCount || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">Avg ${stats?.avgTransaction?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                            <p className="text-xs text-blue-400 font-medium mb-1">Net Cash Flow</p>
                            {cashFlow ? (
                                <>
                                    <p className={`text-2xl font-bold ${cashFlow.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {cashFlow.netCashFlow >= 0 ? '+' : ''}${Math.abs(cashFlow.netCashFlow).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1">
                                        {cashFlow.trendPercent >= 0
                                            ? <ArrowUpRight size={13} className="text-emerald-500" />
                                            : <ArrowDownRight size={13} className="text-red-500" />
                                        }
                                        <span className={`text-xs font-medium ${cashFlow.trendPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {Math.abs(cashFlow.trendPercent)}%
                                        </span>
                                    </div>
                                </>
                            ) : <p className="text-2xl font-bold text-gray-300">--</p>}
                        </div>
                    </div>

                    {/* ── ROW 2: Today's Briefing (collapsible) ── */}
                    <div className="bg-white rounded-xl border border-blue-100 shadow-sm">
                        <button
                            onClick={() => setShowBriefing(!showBriefing)}
                            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <BarChart3 size={15} className="text-blue-600" />
                                </div>
                                <span className="font-bold text-blue-900 text-sm tracking-tight">Today's Briefing</span>
                                {(actionItems.length > 0 || (briefing && briefing.bullets.length > 0)) && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">
                                        {actionItems.length + (briefing?.bullets.length || 0)}
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showBriefing ? 'rotate-180' : ''}`} />
                        </button>
                        {showBriefing && (
                            <div className="px-5 pb-4 space-y-2">
                                {briefing?.bullets.map((b, i) => (
                                    <div key={`b-${i}`} className="flex items-center gap-2.5 py-1.5">
                                        {briefingIcon(b.icon)}
                                        <span className="text-sm text-gray-700">{b.text}</span>
                                    </div>
                                ))}
                                {actionItems.map((item, i) => (
                                    <Link key={`a-${i}`} to={item.link} className="flex items-center gap-2.5 py-1.5 group">
                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                        <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">{item.text}</span>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 ml-auto" />
                                    </Link>
                                ))}
                                {actionItems.length === 0 && (!briefing || briefing.bullets.length === 0) && (
                                    <div className="flex items-center gap-2 py-2">
                                        <CheckCircle2 size={15} className="text-emerald-500" />
                                        <span className="text-sm text-gray-600">All caught up — Fluxor is monitoring your store.</span>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <Link to="/sales">
                                        <Button variant="secondary" size="sm"><Upload size={14} /> Import Sales</Button>
                                    </Link>
                                    <Link to="/products">
                                        <Button variant="secondary" size="sm"><Package size={14} /> Inventory</Button>
                                    </Link>
                                    <Link to="/reorder">
                                        <Button variant="secondary" size="sm"><DollarSign size={14} /> Reorder</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── ROW 3: Charts side by side ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Revenue Chart */}
                        <div className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm">
                            <h3 className="text-sm font-bold text-blue-900 tracking-tight mb-3">Revenue This Week</h3>
                            {hasData ? (
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.chartData}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF' }} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF' }} tickFormatter={(v) => `$${v}`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #DBEAFE', borderRadius: '8px', boxShadow: '0 2px 8px rgb(0 0 0 / 0.06)' }}
                                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                                            />
                                            <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center bg-blue-50/50 rounded-lg">
                                    <BarChart3 size={28} className="text-blue-200 mb-2" />
                                    <p className="text-sm text-gray-500">Import sales to see trends</p>
                                    <Link to="/sales" className="mt-2 text-xs text-blue-600 hover:underline">Import Sales Data</Link>
                                </div>
                            )}
                        </div>

                        {/* Cash Flow Chart (collapsible) */}
                        <div className="bg-white rounded-xl border border-blue-100 shadow-sm">
                            <button
                                onClick={() => setShowCashFlow(!showCashFlow)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left"
                            >
                                <div>
                                    <h3 className="text-sm font-bold text-blue-900 tracking-tight">Cash Flow</h3>
                                    <p className="text-xs text-gray-400">Sales vs supplier costs (14 days)</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {cashFlow && (
                                        <div className="flex items-center gap-1">
                                            {cashFlow.trendPercent >= 0
                                                ? <ArrowUpRight size={13} className="text-emerald-500" />
                                                : <ArrowDownRight size={13} className="text-red-500" />
                                            }
                                            <span className={`text-xs font-medium ${cashFlow.trendPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {Math.abs(cashFlow.trendPercent)}%
                                            </span>
                                        </div>
                                    )}
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCashFlow ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {showCashFlow && cashFlow && (
                                <div className="px-5 pb-5">
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="bg-blue-50 rounded-lg p-2.5">
                                            <p className="text-[10px] text-blue-400 uppercase font-medium">Inflow</p>
                                            <p className="text-sm font-bold text-gray-900">${cashFlow.totalInflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-2.5">
                                            <p className="text-[10px] text-blue-400 uppercase font-medium">Outflow</p>
                                            <p className="text-sm font-bold text-gray-900">${cashFlow.totalOutflow.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-2.5">
                                            <p className="text-[10px] text-blue-400 uppercase font-medium">7-Day Net</p>
                                            <p className={`text-sm font-bold ${cashFlow.last7DaysNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {cashFlow.last7DaysNet >= 0 ? '+' : ''}${cashFlow.last7DaysNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={cashFlow.daily.slice(-14)} barGap={1}>
                                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF' }}
                                                    tickFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })} />
                                                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF' }} tickFormatter={(v) => `$${v}`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #DBEAFE', borderRadius: '8px', fontSize: 12 }}
                                                    formatter={(value: number, name: string) => [`$${value.toFixed(0)}`, name === 'inflow' ? 'Sales' : 'Costs']}
                                                    labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                />
                                                <Bar dataKey="inflow" fill="#3B82F6" radius={[2, 2, 0, 0]} name="inflow" />
                                                <Bar dataKey="outflow" fill="#93C5FD" radius={[2, 2, 0, 0]} name="outflow" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── ROW 4: Money Wasted + Inventory Health (collapsible) ── */}
                    {(moneyWasted?.summary.totalWasted || inventoryHealth) && (
                        <div className="bg-white rounded-xl border border-blue-100 shadow-sm">
                            <button
                                onClick={() => setShowInventory(!showInventory)}
                                className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                                        <AlertCircle size={15} className="text-amber-500" />
                                    </div>
                                    <span className="font-bold text-blue-900 text-sm tracking-tight">Inventory Insights</span>
                                    {moneyWasted && moneyWasted.summary.totalWasted > 0 && (
                                        <span className="text-xs text-red-500 font-medium">
                                            ${moneyWasted.summary.totalWasted.toLocaleString('en-US', { maximumFractionDigits: 0 })} at risk
                                        </span>
                                    )}
                                </div>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showInventory ? 'rotate-180' : ''}`} />
                            </button>
                            {showInventory && (
                                <div className="px-5 pb-5 space-y-4">
                                    {moneyWasted && moneyWasted.summary.totalWasted > 0 && (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-red-50 rounded-lg p-3">
                                                <p className="text-[10px] text-gray-500 uppercase">Dead Stock</p>
                                                <p className="text-base font-bold text-gray-900">${moneyWasted.summary.deadStockValue.toFixed(0)}</p>
                                                <p className="text-[10px] text-gray-400">No sales 30+ days</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-3">
                                                <p className="text-[10px] text-gray-500 uppercase">Overstock</p>
                                                <p className="text-base font-bold text-gray-900">${moneyWasted.summary.overstockValue.toFixed(0)}</p>
                                                <p className="text-[10px] text-gray-400">Excess inventory</p>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-3">
                                                <p className="text-[10px] text-gray-500 uppercase">Missed Sales</p>
                                                <p className="text-base font-bold text-gray-900">${moneyWasted.summary.missedSalesValue.toFixed(0)}</p>
                                                <p className="text-[10px] text-gray-400">From stockouts</p>
                                            </div>
                                        </div>
                                    )}

                                    {inventoryHealth && (inventoryHealth.restockAlerts.length > 0 || inventoryHealth.slowMovers.length > 0) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {inventoryHealth.restockAlerts.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <AlertCircle size={13} className="text-amber-500" />
                                                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Restock Soon</h4>
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-auto">{inventoryHealth.summary.restockAlertsCount}</span>
                                                    </div>
                                                    <ul className="space-y-1.5">
                                                        {inventoryHealth.restockAlerts.slice(0, 4).map(item => (
                                                            <li key={item.id} className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-700 truncate max-w-[65%]">{item.name}</span>
                                                                <span className={`text-xs font-medium ${item.urgency === 'critical' ? 'text-red-600' : 'text-gray-500'}`}>
                                                                    {item.daysUntilStockout}d left
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Link to="/products" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-0.5">
                                                        View all <ChevronRight size={12} />
                                                    </Link>
                                                </div>
                                            )}
                                            {inventoryHealth.slowMovers.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Package size={13} className="text-gray-400" />
                                                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Slow Movers</h4>
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full ml-auto">{inventoryHealth.summary.slowMoversCount}</span>
                                                    </div>
                                                    <ul className="space-y-1.5">
                                                        {inventoryHealth.slowMovers.slice(0, 4).map(item => (
                                                            <li key={item.id} className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-700 truncate max-w-[65%]">{item.name}</span>
                                                                <span className="text-xs text-gray-400">
                                                                    {item.daysSinceLastSale ? `${item.daysSinceLastSale}d` : 'No sales'}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Link to="/products" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-0.5">
                                                        View all <ChevronRight size={12} />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {moneyWasted && moneyWasted.insights.length > 0 && (
                                        <p className="text-xs text-gray-500 border-t border-blue-50 pt-3">{moneyWasted.insights[0]}</p>
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
