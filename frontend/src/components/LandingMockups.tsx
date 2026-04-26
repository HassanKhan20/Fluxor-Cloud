import React from 'react';
import {
    LayoutDashboard,
    Package,
    BarChart3,
    Boxes,
    Receipt,
    Users,
    Search,
    Bell,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingBag,
    AlertTriangle,
    Sparkles,
    ArrowUpRight,
    Send,
    Wand2,
} from 'lucide-react';

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
    <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
    >
        <span className="w-3.5 h-3.5">{icon}</span>
        <span>{label}</span>
    </div>
);

const Sparkline: React.FC<{ color: string; trend: 'up' | 'down' }> = ({ color, trend }) => {
    const points = trend === 'up'
        ? '0,28 12,22 24,24 36,16 48,18 60,10 72,12 84,4'
        : '0,8 12,12 24,10 36,18 48,16 60,22 72,20 84,28';
    return (
        <svg viewBox="0 0 84 32" className="w-full h-7" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export const DashboardMockup: React.FC = () => {
    return (
        <div className="relative w-full h-full select-none">
            {/* Window chrome */}
            <div className="absolute inset-0 bg-white rounded-2xl shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] border border-gray-200 overflow-hidden flex">
                {/* Sidebar */}
                <aside className="w-44 shrink-0 bg-gray-50/80 border-r border-gray-200 p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2 px-2 py-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold tracking-tight">F</span>
                        </div>
                        <span className="text-[12px] font-bold text-gray-900 tracking-tight">FLUXOR</span>
                    </div>
                    <SidebarItem icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Dashboard" active />
                    <SidebarItem icon={<Package className="w-3.5 h-3.5" />} label="Products" />
                    <SidebarItem icon={<Boxes className="w-3.5 h-3.5" />} label="Inventory" />
                    <SidebarItem icon={<BarChart3 className="w-3.5 h-3.5" />} label="Analytics" />
                    <SidebarItem icon={<Receipt className="w-3.5 h-3.5" />} label="Invoices" />
                    <SidebarItem icon={<Users className="w-3.5 h-3.5" />} label="Vendors" />
                </aside>

                {/* Main */}
                <main className="flex-1 flex flex-col min-w-0">
                    {/* Topbar */}
                    <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100/80 border border-gray-200 w-56">
                            <Search className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[11px] text-gray-400">Search products, vendors…</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Bell className="w-4 h-4 text-gray-500" />
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[10px] font-semibold text-white">
                                JR
                            </div>
                        </div>
                    </header>

                    {/* Body */}
                    <div className="flex-1 p-5 space-y-4 overflow-hidden">
                        <div>
                            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Tuesday, March 12</div>
                            <h3 className="text-base font-bold text-gray-900 mt-0.5">Today's Briefing</h3>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                                            <DollarSign className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-500">Revenue</span>
                                    </div>
                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                                        <TrendingUp className="w-2.5 h-2.5" />
                                        12.4%
                                    </span>
                                </div>
                                <div className="text-[15px] font-bold text-gray-900 tracking-tight">$1,847.23</div>
                                <Sparkline color="#2563EB" trend="up" />
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center">
                                            <ShoppingBag className="w-3 h-3 text-violet-600" />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-500">Transactions</span>
                                    </div>
                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                                        <TrendingUp className="w-2.5 h-2.5" />
                                        8.1%
                                    </span>
                                </div>
                                <div className="text-[15px] font-bold text-gray-900 tracking-tight">94</div>
                                <Sparkline color="#7C3AED" trend="up" />
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center">
                                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-500">Low Stock</span>
                                    </div>
                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-600">
                                        <TrendingDown className="w-2.5 h-2.5" />
                                        3 new
                                    </span>
                                </div>
                                <div className="text-[15px] font-bold text-gray-900 tracking-tight">14 SKUs</div>
                                <Sparkline color="#E11D48" trend="down" />
                            </div>
                        </div>

                        {/* Chart card */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-[12px] font-semibold text-gray-900">Revenue · last 7 days</div>
                                    <div className="text-[10px] text-gray-500">Daily totals vs prior week</div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                        <span className="w-2 h-2 rounded-full bg-blue-500" /> This week
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <span className="w-2 h-2 rounded-full bg-gray-300" /> Last week
                                    </span>
                                </div>
                            </div>
                            <svg viewBox="0 0 360 90" className="w-full h-[90px]" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="dashGrad" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {/* grid */}
                                <line x1="0" y1="20" x2="360" y2="20" stroke="#F1F5F9" strokeDasharray="3 3" />
                                <line x1="0" y1="50" x2="360" y2="50" stroke="#F1F5F9" strokeDasharray="3 3" />
                                <line x1="0" y1="80" x2="360" y2="80" stroke="#F1F5F9" strokeDasharray="3 3" />
                                {/* prior week */}
                                <polyline
                                    points="0,55 60,50 120,58 180,42 240,48 300,52 360,46"
                                    fill="none"
                                    stroke="#CBD5E1"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeDasharray="4 4"
                                />
                                {/* this week */}
                                <path
                                    d="M0,60 L60,50 L120,55 L180,30 L240,32 L300,18 L360,12 L360,90 L0,90 Z"
                                    fill="url(#dashGrad)"
                                />
                                <polyline
                                    points="0,60 60,50 120,55 180,30 240,32 300,18 360,12"
                                    fill="none"
                                    stroke="#2563EB"
                                    strokeWidth="2.25"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {[
                                    [0, 60], [60, 50], [120, 55], [180, 30], [240, 32], [300, 18], [360, 12]
                                ].map(([x, y], i) => (
                                    <circle key={i} cx={x} cy={y} r={2.5} fill="white" stroke="#2563EB" strokeWidth="1.75" />
                                ))}
                            </svg>
                            <div className="grid grid-cols-7 mt-1.5">
                                {['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map(d => (
                                    <div key={d} className="text-[9px] text-gray-400 text-center">{d}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const ChatBubble: React.FC<{ role: 'user' | 'assistant'; children: React.ReactNode }> = ({ role, children }) => {
    if (role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-[12px] leading-relaxed shadow-sm">
                    {children}
                </div>
            </div>
        );
    }
    return (
        <div className="flex justify-start gap-2 items-start">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="max-w-[80%] bg-white text-gray-800 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[12px] leading-relaxed border border-gray-200 shadow-sm">
                {children}
            </div>
        </div>
    );
};

export const AIAssistantMockup: React.FC = () => {
    return (
        <div className="relative w-full h-full select-none">
            <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50 rounded-2xl shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] border border-gray-200 overflow-hidden flex flex-col">
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <div className="text-[12px] font-semibold text-gray-900 leading-tight">Fluxor Assistant</div>
                            <div className="text-[10px] text-emerald-600 leading-tight flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Connected to QuickStop
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Live</span>
                </header>

                {/* Messages */}
                <div className="flex-1 px-4 py-4 space-y-3 overflow-hidden">
                    <ChatBubble role="user">
                        Why did beverages drop yesterday?
                    </ChatBubble>

                    <ChatBubble role="assistant">
                        <p className="text-gray-900 font-semibold mb-1.5">Beverages dropped 18% — here's why</p>
                        <p className="text-gray-600">Coke 20oz stocked out at 2:14pm. You missed an estimated <span className="font-semibold text-gray-900">$214 in sales</span> across the afternoon rush.</p>
                        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Lost units</div>
                                <div className="text-[13px] font-bold text-gray-900">~96</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Restock ETA</div>
                                <div className="text-[13px] font-bold text-gray-900">Wed 9am</div>
                            </div>
                        </div>
                    </ChatBubble>

                    <ChatBubble role="user">
                        Draft a reorder for PepsiCo.
                    </ChatBubble>

                    <ChatBubble role="assistant">
                        <p className="text-gray-600 mb-2">Drafted a reorder of <span className="font-semibold text-gray-900">3 SKUs · $186.40</span> based on 14-day sell-through.</p>
                        <div className="flex items-center gap-1.5">
                            <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 text-white text-[10px] font-medium shadow-sm">
                                <Send className="w-2.5 h-2.5" /> Send to PepsiCo
                            </button>
                            <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-gray-700 text-[10px] font-medium border border-gray-200">
                                Review
                            </button>
                        </div>
                    </ChatBubble>
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100/80 border border-gray-200">
                        <Wand2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[11px] text-gray-400 flex-1">Ask anything about your store…</span>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-gray-200">
                            <ArrowUpRight className="w-2.5 h-2.5 text-gray-500" />
                            <span className="text-[9px] text-gray-500 font-medium">Send</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardMockup;
