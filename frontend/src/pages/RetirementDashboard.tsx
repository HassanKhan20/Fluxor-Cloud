// Retirement-home dashboard.
// Calmer green-and-white theme, heart-forward warmth, zero convenience-store data.
// Pulls only from /api/retirement/* — no sales, transactions, or revenue.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar,
    Clock,
    PencilLine,
    Settings,
    Bell,
    Heart,
    HeartHandshake,
    Utensils,
    ClipboardList,
    Users,
    Coffee,
    Truck,
    Printer,
    AlertTriangle,
    Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import AlertsDropdown from '@/components/dashboard/AlertsDropdown';
import GlobalSearch from '@/components/GlobalSearch';
import WarmthIllustration from '@/components/WarmthIllustration';
import { retirementApi, type Resident, type DailyCensus, type PrepSheet, type StockoutRow, type StockoutSummary } from '@/lib/retirementApi';

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    to: string;
}
const QuickAction: React.FC<QuickActionProps> = ({ icon, label, to }) => (
    <Link to={to} className="flex flex-col items-center gap-2 group">
        <span className="w-12 h-12 rounded-full bg-white text-emerald-700 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
            {icon}
        </span>
        <span className="text-[11px] font-medium text-white/85 group-hover:text-white tracking-tight whitespace-nowrap">
            {label}
        </span>
    </Link>
);

function greetingByHour(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}

function CareMetric({ label, value, sublabel, icon, tone = 'default' }: {
    label: string;
    value: string;
    sublabel?: string;
    icon: React.ReactNode;
    tone?: 'default' | 'amber' | 'red';
}) {
    const valueCls = tone === 'red' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-ink-900';
    return (
        <div className="bg-white border border-emerald-100 rounded-2xl px-5 py-4 hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-emerald-700/70 font-semibold">{label}</p>
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    {icon}
                </span>
            </div>
            <p className={`font-display text-[28px] font-semibold tabular-nums tracking-tightest leading-none mt-2 ${valueCls}`}>{value}</p>
            {sublabel && <p className="text-[11.5px] text-ink-500 mt-1.5">{sublabel}</p>}
        </div>
    );
}

export default function RetirementDashboard() {
    const [residents, setResidents] = useState<Resident[]>([]);
    const [todayCensus, setTodayCensus] = useState<DailyCensus | null>(null);
    const [todayPrep, setTodayPrep] = useState<PrepSheet | null>(null);
    const [stockout, setStockout] = useState<{ rows: StockoutRow[]; summary: StockoutSummary } | null>(null);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        try {
            const u = localStorage.getItem('user');
            if (u) setUserName(JSON.parse(u).name?.split(' ')[0] || '');
        } catch {
            // ignore
        }

        (async () => {
            try {
                const today = new Date().toISOString().slice(0, 10);
                const [r, prep, sw] = await Promise.all([
                    retirementApi.listResidents().catch(() => ({ residents: [] as Resident[] })),
                    retirementApi.getPrepSheet(today).catch(() => null),
                    retirementApi.getStockoutWatch().catch(() => null),
                ]);
                setResidents(r.residents);
                setTodayPrep(prep);
                setTodayCensus(prep?.census ?? null);
                setStockout(sw);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const timeLabel = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const initials = (userName || 'C').slice(0, 1).toUpperCase();

    const totalServingsToday = todayPrep?.dishes?.reduce((s: number, d: any) => s + (d.servings || 0), 0) ?? 0;
    const allergensCount = todayPrep?.modSummary?.allergens?.length ?? 0;
    const textureCount =
        (todayPrep?.modSummary?.mechanicalSoft ?? 0) +
        (todayPrep?.modSummary?.pureed ?? 0) +
        (todayPrep?.modSummary?.thickenedLiquids ?? 0);
    const dietMods =
        (todayPrep?.modSummary?.diabetic ?? 0) +
        (todayPrep?.modSummary?.lowSodium ?? 0) +
        (todayPrep?.modSummary?.renal ?? 0) +
        (todayPrep?.modSummary?.cardiac ?? 0) +
        (todayPrep?.modSummary?.glutenFree ?? 0) +
        (todayPrep?.modSummary?.vegetarian ?? 0);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-emerald-50/40 flex items-center justify-center font-sans">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-emerald-800 text-[13px]">Preparing your day…</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-white font-sans">
                <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">

                    {/* HERO — soft green gradient with heart pattern */}
                    <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 p-7 lg:p-9 shadow-[0_20px_50px_-20px_rgba(5,150,105,0.45)] relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
                            <svg className="w-full h-full" preserveAspectRatio="none">
                                <defs>
                                    <pattern id="heartpattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                                        <path d="M30 42 C 22 32, 12 28, 12 18 C 12 12, 17 8, 22 8 C 26 8, 30 12, 30 16 C 30 12, 34 8, 38 8 C 43 8, 48 12, 48 18 C 48 28, 38 32, 30 42 Z" fill="white" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#heartpattern)" />
                            </svg>
                        </div>

                        {/* Top toolbar */}
                        <div className="relative flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center text-emerald-700 font-display font-semibold text-base shadow-sm flex-shrink-0">
                                {initials}
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 text-white text-[12px] font-medium backdrop-blur-sm">
                                <Calendar className="w-3.5 h-3.5" />
                                {dateLabel}
                            </span>
                            <GlobalSearch placeholder="Search residents, menu items, supplies…" variant="light" />
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

                        {/* Greeting + morning scene */}
                        <div className="relative mt-8 lg:mt-10 flex items-end justify-between gap-4">
                            <div className="max-w-2xl flex-1">
                                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75 flex items-center gap-1.5">
                                    <Heart className="w-3 h-3 fill-white/80" /> Today
                                </p>
                                <h1 className="font-display text-[34px] lg:text-[42px] font-semibold text-white tracking-tightest leading-[1.05] mt-1.5">
                                    Good {greetingByHour()}, {userName || 'friend'}.
                                </h1>
                                <p className="text-white/85 mt-2.5 text-[14px] max-w-xl">
                                    {residents.length === 0
                                        ? "Add your first resident to start tracking dietary needs and care plans."
                                        : `${todayCensus?.count ?? residents.length} residents in your care today. Wishing them a calm, comfortable day.`}
                                </p>
                            </div>
                            <div className="hidden lg:block flex-shrink-0">
                                <WarmthIllustration variant="morning" size="md" />
                            </div>
                        </div>

                        {/* Quick remind + actions */}
                        <div className="relative mt-7 lg:mt-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                            <div className="flex items-center gap-2 text-white/80 text-[12.5px]">
                                <Bell className="w-3.5 h-3.5" />
                                {allergensCount > 0 ? (
                                    <>
                                        <span>Heads up:</span>
                                        <Link to="/kitchen/prep" className="text-white font-medium hover:underline">{allergensCount} resident{allergensCount === 1 ? '' : 's'}</Link>
                                        <span>with allergens on the roster today.</span>
                                    </>
                                ) : (
                                    <span className="text-white/85">A clear day — no allergen flags.</span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-end gap-x-4 gap-y-3 lg:gap-x-5">
                                <QuickAction icon={<HeartHandshake className="w-5 h-5" />} label="Residents" to="/residents" />
                                <QuickAction icon={<Utensils className="w-5 h-5" />} label="Menu & Plan" to="/kitchen" />
                                <QuickAction icon={<ClipboardList className="w-5 h-5" />} label="Today's Prep" to="/kitchen/prep" />
                                <QuickAction icon={<Printer className="w-5 h-5" />} label="Tray Tickets" to="/kitchen/tray-tickets" />
                                <QuickAction icon={<Coffee className="w-5 h-5" />} label="Tablet Logger" to="/kitchen/log" />
                                <QuickAction icon={<Truck className="w-5 h-5" />} label="Vendors" to="/vendors" />
                            </div>
                        </div>
                    </div>

                    {/* Care-focused KPIs — no revenue, no transactions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <CareMetric
                            label="Active residents"
                            value={String(residents.length)}
                            sublabel={todayCensus ? `${todayCensus.count} present today` : 'roster total'}
                            icon={<HeartHandshake className="w-4 h-4" />}
                        />
                        <CareMetric
                            label="Servings planned"
                            value={String(totalServingsToday)}
                            sublabel={`across ${todayPrep?.dishes?.length ?? 0} dishes`}
                            icon={<Utensils className="w-4 h-4" />}
                        />
                        <CareMetric
                            label="Diet modifications"
                            value={String(dietMods)}
                            sublabel="diabetic / low-Na / etc"
                            icon={<ClipboardList className="w-4 h-4" />}
                            tone={dietMods > 0 ? 'amber' : 'default'}
                        />
                        <CareMetric
                            label="Texture-modified"
                            value={String(textureCount)}
                            sublabel="soft / pureed / thickened"
                            icon={<Coffee className="w-4 h-4" />}
                            tone={textureCount > 0 ? 'amber' : 'default'}
                        />
                    </div>

                    {/* Stockout watch — only render if there is anything worth flagging */}
                    {stockout && stockout.rows.filter(r => r.urgency !== 'ok').length > 0 && (
                        <StockoutWatchCard rows={stockout.rows} summary={stockout.summary} />
                    )}

                    {/* Two side-by-side at-a-glance cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Roster preview */}
                        <div className="bg-white border border-emerald-100 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-emerald-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-700" />
                                    <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">Residents</span>
                                </div>
                                <Link to="/residents" className="text-[11.5px] font-medium text-emerald-700 hover:text-emerald-800">Manage →</Link>
                            </div>
                            {residents.length === 0 ? (
                                <div className="px-6 py-10 text-center">
                                    <Heart className="w-8 h-8 text-emerald-200 mx-auto mb-3 fill-emerald-100" />
                                    <p className="text-[13px] font-semibold text-ink-900">No residents yet</p>
                                    <p className="text-[12px] text-ink-500 mt-1">Add your first resident to get started.</p>
                                    <Link to="/residents" className="mt-3 inline-block text-[12.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg">Add resident</Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-emerald-50">
                                    {residents.slice(0, 6).map(r => {
                                        const dp = r.dietaryProfile;
                                        const flags: string[] = [];
                                        if (dp?.diabetic) flags.push('diabetic');
                                        if (dp?.lowSodium) flags.push('low-Na');
                                        if (dp?.renal) flags.push('renal');
                                        if (dp?.texture && dp.texture !== 'regular') flags.push(dp.texture.replace('_', ' '));
                                        return (
                                            <div key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                                                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-display font-semibold text-[12px] flex-shrink-0">
                                                    {r.name.slice(0, 1).toUpperCase()}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[13px] font-semibold text-ink-900 tracking-tight truncate">{r.name}</div>
                                                    <div className="text-[11px] text-ink-500 truncate">
                                                        {r.room ? `Room ${r.room}` : 'No room'}
                                                        {flags.length > 0 && ` · ${flags.join(', ')}`}
                                                    </div>
                                                </div>
                                                {dp?.allergens && (
                                                    <span className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">allergen</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {residents.length > 6 && (
                                        <Link to="/residents" className="block px-5 py-2.5 text-[12px] text-center text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/50 transition-colors">
                                            View all {residents.length} residents →
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Today's dishes */}
                        <div className="bg-white border border-emerald-100 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-emerald-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Utensils className="w-4 h-4 text-emerald-700" />
                                    <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">On today's menu</span>
                                </div>
                                <Link to="/kitchen" className="text-[11.5px] font-medium text-emerald-700 hover:text-emerald-800">Plan →</Link>
                            </div>
                            {!todayPrep || !todayPrep.dishes || todayPrep.dishes.length === 0 ? (
                                <div className="px-6 py-10 text-center">
                                    <Utensils className="w-8 h-8 text-emerald-200 mx-auto mb-3" />
                                    <p className="text-[13px] font-semibold text-ink-900">Nothing scheduled today</p>
                                    <p className="text-[12px] text-ink-500 mt-1">Plan meals on the calendar to see them here.</p>
                                    <Link to="/kitchen" className="mt-3 inline-block text-[12.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg">Open meal plan</Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-emerald-50">
                                    {todayPrep.dishes.map((d: any) => (
                                        <div key={d.mealPlanId} className="flex items-center gap-3 px-5 py-2.5">
                                            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                                                <Utensils className="w-3.5 h-3.5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-semibold text-ink-900 tracking-tight truncate">{d.menuItemName}</div>
                                                <div className="text-[11px] text-ink-500">
                                                    {d.category && <span className="capitalize">{d.category}</span>}
                                                    {d.ingredients?.length > 0 && ` · ${d.ingredients.length} ingredients`}
                                                </div>
                                            </div>
                                            <span className="font-display text-[14px] font-semibold text-emerald-700 tabular-nums tracking-tight">{d.servings}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Heartfelt footer */}
                    <div className="text-center pt-6 pb-2">
                        <p className="text-[12px] text-emerald-800/70 flex items-center justify-center gap-1.5">
                            <Heart className="w-3 h-3 fill-emerald-600 text-emerald-600" /> Thank you for the care you give every day.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function StockoutWatchCard({ rows, summary }: { rows: StockoutRow[]; summary: StockoutSummary }) {
    const flagged = rows.filter(r => r.urgency !== 'ok').slice(0, 6);
    const toneCls: Record<string, string> = {
        critical: 'bg-rose-50 text-rose-700 border-rose-200',
        warning:  'bg-amber-50 text-amber-700 border-amber-200',
        watch:    'bg-blue-50 text-blue-700 border-blue-200',
    };
    const dotCls: Record<string, string> = {
        critical: 'bg-rose-500',
        warning:  'bg-amber-500',
        watch:    'bg-blue-500',
    };

    return (
        <div className="bg-white border border-emerald-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-700" />
                    <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">Stockout watch</span>
                    <span className="font-mono text-[10.5px] text-ink-500 uppercase tracking-[0.12em]">predicted from recent use × upcoming menu</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
                    {summary.critical > 0 && <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">{summary.critical} critical</span>}
                    {summary.warning > 0  && <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">{summary.warning} warning</span>}
                    {summary.watch > 0    && <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{summary.watch} watch</span>}
                </div>
            </div>
            <div className="divide-y divide-emerald-50">
                {flagged.map(r => (
                    <div key={r.productId} className="flex items-center gap-3 px-5 py-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls[r.urgency]}`} />
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-ink-900 tracking-tight truncate">{r.productName}</div>
                            <div className="text-[11px] text-ink-500 tabular-nums truncate">
                                {r.onHand.toFixed(1)} {r.unit ?? ''} on hand · using {r.effectiveDailyDemand}/day
                                {r.vendorName && ` · ${r.vendorName} (${r.leadTimeDays}d lead)`}
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full border whitespace-nowrap ${toneCls[r.urgency]}`}>
                                {r.daysUntilStockout < 1
                                    ? `< 1 day`
                                    : r.daysUntilStockout >= 999
                                      ? `—`
                                      : `${r.daysUntilStockout.toFixed(1)} days`}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {flagged.length > 0 && summary.critical > 0 && (
                <div className="bg-rose-50/60 border-t border-rose-100 px-5 py-2.5 flex items-start gap-2 text-[11.5px] text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                        <strong className="font-semibold">{summary.critical}</strong> item{summary.critical === 1 ? ' will' : 's will'} run out before the next vendor delivery. Consider running an unscheduled order.
                    </span>
                </div>
            )}
        </div>
    );
}
