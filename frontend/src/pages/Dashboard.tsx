import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
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
    CheckCircle2,
    Zap,
    Clock,
    Bot,
    X,
    Send
} from 'lucide-react';
import type { DashboardStats } from '@/types';
import Button from '@/components/Button';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [aiTooltipVisible, setAiTooltipVisible] = useState(true);
    const [userName, setUserName] = useState<string>('');

    // AI Chat state
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        fetchStats();
        loadUserInfo();
    }, []);

    // Send message to AI
    const sendMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMessage })
            });

            if (response.ok) {
                const data = await response.json();
                setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that request. Please try again." }]);
            }
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Make sure the server is running." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Format AI messages with simple markdown rendering
    const formatAIMessage = (content: string) => {
        // Split by newlines and render
        const lines = content.split('\n');
        return lines.map((line, i) => {
            // Handle bullet points
            if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
                return (
                    <div key={i} className="flex gap-2 mt-1">
                        <span className="text-blue-500">•</span>
                        <span dangerouslySetInnerHTML={{ __html: line.replace(/^[\s•\-\d.]+/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>') }} />
                    </div>
                );
            }
            // Handle bold text
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
            return <p key={i} className={i > 0 ? 'mt-2' : ''} dangerouslySetInnerHTML={{ __html: formatted }} />;
        });
    };

    const loadUserInfo = () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // Extract first name
                const firstName = user.name?.split(' ')[0] || '';
                setUserName(firstName);
            }
        } catch {
            // Graceful fallback - no name shown
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/dashboard/stats', token || '');
            setStats(data);
        } catch (error) {
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

    // Calculate action items
    const getActionItems = () => {
        const items: { text: string; type: 'warning' | 'info' | 'success'; link: string }[] = [];

        if (stats?.lowStockCount && stats.lowStockCount > 0) {
            items.push({
                text: `${stats.lowStockCount} products likely to stock out soon`,
                type: 'warning',
                link: '/products'
            });
        }

        if (stats?.unmatchedCount && stats.unmatchedCount > 0) {
            items.push({
                text: `${stats.unmatchedCount} inventory items ready to auto-fix`,
                type: 'info',
                link: '/products'
            });
        }

        if (stats?.productsWithoutStock && stats.productsWithoutStock > 0) {
            items.push({
                text: `${stats.productsWithoutStock} products need starting stock`,
                type: 'info',
                link: '/products'
            });
        }

        return items;
    };

    const actionItems = getActionItems();
    const hasActions = actionItems.length > 0;
    const hasData = stats && stats.chartData && stats.chartData.length > 0;

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

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className="h-20 flex items-center px-4 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-2">
                        {/* Premium Cloud + Hexagon Network Logo */}
                        <svg viewBox="0 0 40 40" className="h-10 w-10 flex-shrink-0">
                            <defs>
                                <linearGradient id="sidebarCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#1E3A5F" />
                                    <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                            </defs>
                            {/* Light blue background */}
                            <rect x="0" y="0" width="40" height="40" rx="10" fill="#E0F2FE" />
                            <path d="M32 22c0-4.4-3.6-8-8-8-1.5 0-2.9.4-4.1 1.1C18.5 12.3 15.5 10 12 10c-4.4 0-8 3.6-8 8 0 .4 0 .8.1 1.2C1.7 20.1 0 22.4 0 25c0 3.3 2.7 6 6 6h24c3.3 0 6-2.7 6-6 0-2.6-1.7-4.8-4-5.6 0-.1 0-.3 0-.4z"
                                fill="url(#sidebarCloudGrad)" transform="translate(4, 5) scale(0.8)" />
                            <g transform="translate(20, 20)">
                                <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="none" stroke="white" strokeWidth="1.2" opacity="0.95" />
                                <circle cx="0" cy="-6" r="1.5" fill="white" />
                                <circle cx="5.2" cy="-3" r="1.5" fill="white" />
                                <circle cx="5.2" cy="3" r="1.5" fill="white" />
                                <circle cx="0" cy="6" r="1.5" fill="white" />
                                <circle cx="-5.2" cy="3" r="1.5" fill="white" />
                                <circle cx="-5.2" cy="-3" r="1.5" fill="white" />
                            </g>
                        </svg>
                        {sidebarOpen && (
                            <div className="flex flex-col">
                                <span className="text-base font-bold tracking-tight text-slate-800">FLUXOR</span>
                                <span className="text-[10px] font-medium tracking-widest text-blue-500">CLOUD</span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { icon: <BarChart3 size={20} />, label: 'Dashboard', path: '/dashboard', active: true },
                        { icon: <Package size={20} />, label: 'Inventory', path: '/products', active: false },
                        { icon: <Upload size={20} />, label: 'Import Sales', path: '/sales', active: false },
                        { icon: <TrendingUp size={20} />, label: 'Invoices', path: '/invoices', active: false },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${item.active
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
                    <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                        <Settings size={20} />
                        {sidebarOpen && <span className="font-medium text-sm">Settings</span>}
                    </Link>
                    <button
                        onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="font-medium text-sm">Sign out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
                {/* Header */}
                <header className="bg-blue-100 border-b border-blue-200 sticky top-0 z-10">
                    <div className="flex items-center justify-between px-6 h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 hover:bg-blue-100 rounded-lg text-gray-600"
                            >
                                <Menu size={20} />
                            </button>
                            <div>
                                <h1 className="font-semibold text-gray-900 text-lg">
                                    Hi{userName ? ` ${userName}` : ''} 👋
                                </h1>
                                <p className="text-sm text-gray-600">Here's what needs your attention today</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2.5 hover:bg-blue-100 rounded-xl text-gray-600 relative transition-colors">
                                <Bell size={20} />
                                {hasActions && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full" />
                                )}
                            </button>
                            <button className="p-2.5 hover:bg-blue-100 rounded-xl text-gray-600 transition-colors">
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="p-6 max-w-5xl mx-auto space-y-6">

                    {/* 1. TODAY'S ACTIONS (PRIMARY) */}
                    {hasActions ? (
                        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Zap size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">Today's Actions</h2>
                                    <p className="text-sm text-gray-500">{actionItems.length} items need your attention</p>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-5">
                                {actionItems.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                            }`} />
                                        <span className="text-gray-700">{item.text}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex gap-3">
                                <Link to="/products">
                                    <Button variant="primary" size="md">
                                        <Sparkles size={16} />
                                        Review with AI
                                    </Button>
                                </Link>
                                <Link to="/products">
                                    <Button variant="ghost" size="md">
                                        View details
                                        <ChevronRight size={16} />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle2 size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-green-900">All caught up today</p>
                                    <p className="text-sm text-green-700">Fluxor is monitoring your store.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. KEY OPERATIONAL SIGNALS (SECONDARY) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Revenue - de-emphasized */}
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-500">Today's revenue</p>
                                <BarChart3 size={16} className="text-gray-400" />
                            </div>
                            <p className="text-2xl font-semibold text-gray-900">
                                ${stats?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                            {stats?.totalRevenue === 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                    No sales recorded yet — sales typically pick up later.
                                </p>
                            )}
                        </div>

                        {/* Sales count */}
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-500">Transactions</p>
                                <TrendingUp size={16} className="text-gray-400" />
                            </div>
                            <p className="text-2xl font-semibold text-gray-900">{stats?.salesCount || 0}</p>
                            {stats?.salesCount === 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Import sales data to start tracking.
                                </p>
                            )}
                        </div>

                        {/* Average transaction */}
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-500">Avg. transaction</p>
                                <Clock size={16} className="text-gray-400" />
                            </div>
                            <p className="text-2xl font-semibold text-gray-900">
                                ${stats?.avgTransaction?.toFixed(2) || '0.00'}
                            </p>
                            {(!stats?.avgTransaction || stats.avgTransaction === 0) && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Calculated from today's sales.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-3">
                        <Link to="/sales">
                            <Button variant="secondary" size="sm">
                                <Upload size={16} />
                                Import Sales
                            </Button>
                        </Link>
                        <Link to="/products">
                            <Button variant="secondary" size="sm">
                                <Package size={16} />
                                Manage Inventory
                            </Button>
                        </Link>
                    </div>

                    {/* 3. TRENDS & CHARTS (TERTIARY) */}
                    <div className="bg-white rounded-xl p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="font-semibold text-gray-900">Revenue this week</h2>
                                <p className="text-sm text-gray-500">Daily breakdown</p>
                            </div>
                        </div>

                        {hasData ? (
                            <div className="h-56">
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
                                                border: '1px solid #E5E7EB',
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
                            <div className="h-56 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                                <BarChart3 size={32} className="text-gray-300 mb-3" />
                                <p className="text-gray-600 font-medium">We'll show weekly trends once more sales are imported.</p>
                                <Link to="/sales" className="mt-3">
                                    <Button variant="primary" size="sm">
                                        <Upload size={14} />
                                        Import Sales Data
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* 4. AI ASSISTANT - Floating Mascot with Glow */}
            <div className="fixed bottom-6 right-6 z-40 flex items-end gap-3">
                {/* Tooltip Bubble */}
                {aiTooltipVisible && !aiPanelOpen && (
                    <div className="relative bg-white rounded-xl shadow-xl border border-gray-100 p-3 pr-8 max-w-[200px] animate-fade-in-up">
                        <button
                            onClick={() => setAiTooltipVisible(false)}
                            className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                        <p className="text-sm font-medium text-gray-800">Need help?</p>
                        <p className="text-xs text-gray-500 mt-0.5">Ask Fluxor AI anything about your store!</p>
                        {/* Arrow pointing to button */}
                        <div className="absolute -right-2 bottom-4 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-white" />
                    </div>
                )}

                {/* AI Button with Radial Glow */}
                <div className="relative">
                    {/* Radial glow behind button */}
                    <div
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{
                            background: 'radial-gradient(circle, rgba(0, 92, 255, 0.5) 0%, rgba(0, 92, 255, 0.2) 40%, transparent 70%)',
                            transform: 'scale(2.5)',
                            filter: 'blur(8px)'
                        }}
                    />
                    <button
                        onClick={() => { setAiPanelOpen(true); setAiTooltipVisible(false); }}
                        className="relative w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
                        style={{
                            boxShadow: '0 0 25px rgba(0, 92, 255, 0.6), 0 0 50px rgba(0, 92, 255, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)'
                        }}
                        title="Ask Fluxor AI"
                    >
                        <Bot size={24} className="text-white" />
                    </button>
                </div>
            </div>

            {/* AI Panel Slide-out */}
            {aiPanelOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20"
                        onClick={() => setAiPanelOpen(false)}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                {/* Fluxor Robot Mascot - Monotone */}
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg viewBox="0 0 64 64" className="w-8 h-8" fill="none">
                                        {/* Robot head */}
                                        <circle cx="32" cy="28" r="16" fill="white" opacity="0.95" />
                                        {/* Eyes */}
                                        <circle cx="26" cy="26" r="4" fill="#3B82F6" />
                                        <circle cx="38" cy="26" r="4" fill="#3B82F6" />
                                        <circle cx="27" cy="25" r="1.5" fill="white" />
                                        <circle cx="39" cy="25" r="1.5" fill="white" />
                                        {/* Antenna */}
                                        <line x1="32" y1="12" x2="32" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="32" cy="5" r="2" fill="#FBBF24" />
                                        {/* Smile */}
                                        <path d="M26 32 Q32 36 38 32" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round" />
                                        {/* Body */}
                                        <rect x="24" y="44" rx="4" width="16" height="12" fill="white" opacity="0.9" />
                                        {/* Arms */}
                                        <circle cx="18" cy="50" r="4" fill="white" opacity="0.8" />
                                        <circle cx="46" cy="50" r="4" fill="white" opacity="0.8" />
                                        {/* Cloud base */}
                                        <ellipse cx="32" cy="58" rx="14" ry="4" fill="white" opacity="0.6" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Fluxor AI</h3>
                                    <p className="text-xs text-gray-500">Your operations assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAiPanelOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {/* Proactive insight */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Bot size={16} className="text-slate-600" />
                                </div>
                                <div className="bg-gray-50 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {hasActions
                                            ? `I noticed ${actionItems.length} items need attention today. Would you like me to help prioritize them?`
                                            : "Everything looks good today. I'm monitoring your store for any changes."
                                        }
                                    </p>
                                </div>
                            </div>

                            {stats?.lowStockCount && stats.lowStockCount > 0 && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <AlertCircle size={16} className="text-amber-600" />
                                    </div>
                                    <div className="bg-amber-50 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                        <p className="text-sm text-amber-800 leading-relaxed">
                                            {stats.lowStockCount} products are running low. I can help you create a restock list.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Chat Messages */}
                            {chatMessages.map((msg, index) => (
                                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-100'
                                        }`}>
                                        {msg.role === 'user'
                                            ? <span className="text-white text-xs font-semibold">{userName?.[0]?.toUpperCase() || 'U'}</span>
                                            : <Bot size={16} className="text-slate-600" />
                                        }
                                    </div>
                                    <div className={`rounded-xl px-4 py-3 max-w-[85%] ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-gray-50 text-gray-700 rounded-tl-sm'
                                        }`}>
                                        <div className="text-sm leading-relaxed">
                                            {msg.role === 'user' ? msg.content : formatAIMessage(msg.content)}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {chatLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Bot size={16} className="text-slate-600" />
                                    </div>
                                    <div className="bg-gray-50 rounded-xl rounded-tl-sm px-4 py-3">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-100">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask about your store..."
                                    disabled={chatLoading}
                                    className="w-full py-3 px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:opacity-50"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={chatLoading || !chatInput.trim()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={14} className="text-white" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                Fluxor AI helps with inventory, sales, and operations decisions.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
