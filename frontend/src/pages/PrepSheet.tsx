// Today's Prep Sheet — single read-only view aggregating census, dietary
// modifications, and per-dish ingredient totals. Designed to print on
// a single sheet that the morning chef can hang on the line.

import { useEffect, useState } from 'react';
import { ClipboardList, Calendar, Users, AlertTriangle, Printer, Utensils } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import WarmthIllustration from '@/components/WarmthIllustration';
import { retirementApi, type PrepSheet } from '@/lib/retirementApi';

export default function PrepSheetPage() {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState<string>(today);
    const [sheet, setSheet] = useState<PrepSheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [censusInput, setCensusInput] = useState('');
    const [busy, setBusy] = useState(false);

    async function refresh() {
        setLoading(true);
        try {
            const s = await retirementApi.getPrepSheet(date);
            setSheet(s);
            setCensusInput(s.census ? String(s.census.count) : '');
        } finally { setLoading(false); }
    }
    useEffect(() => { refresh(); }, [date]);

    async function saveCensus() {
        const n = parseInt(censusInput);
        if (isNaN(n) || n < 0) return;
        setBusy(true);
        try {
            await retirementApi.upsertCensus(date, n);
            await refresh();
        } finally { setBusy(false); }
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-ink-100/60 font-sans print:bg-white">
                <div className="max-w-[1200px] mx-auto p-6 lg:p-8 space-y-5 print:p-4">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
                        <div className="flex-1">
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Kitchen</p>
                            <h1 className="font-display text-3xl font-semibold text-ink-900 tracking-tightest mt-1.5">Today's Prep</h1>
                            <p className="text-[13.5px] text-ink-600 mt-1.5">Production sheet for the morning shift — census × menu × diets, in one place.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block">
                                <WarmthIllustration variant="prep" size="md" />
                            </div>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white border border-ink-200 rounded-lg px-3 py-2 text-[13px]" />
                            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-900 hover:bg-ink-800 px-3.5 py-2 rounded-lg">
                                <Printer className="w-3.5 h-3.5" /> Print
                            </button>
                        </div>
                    </div>

                    {/* Print header (only visible on print) */}
                    <div className="hidden print:block">
                        <h1 className="font-display text-2xl font-bold text-ink-900">Production Prep Sheet — {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h1>
                    </div>

                    {loading ? (
                        <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-[13px] text-ink-500">Loading…</div>
                    ) : !sheet ? (
                        <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-[13px] text-ink-500">No prep data available.</div>
                    ) : (
                        <>
                            {/* Top stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-white border border-ink-200 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-3.5 h-3.5 text-ink-500" />
                                        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Date</span>
                                    </div>
                                    <p className="font-display text-[18px] font-semibold text-ink-900 tracking-tight">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                </div>
                                <div className="bg-white border border-ink-200 rounded-2xl p-4 print:hidden">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-3.5 h-3.5 text-ink-500" />
                                        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Census</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={censusInput}
                                            onChange={e => setCensusInput(e.target.value)}
                                            placeholder={String(sheet.residentsActive)}
                                            className="font-display text-[24px] font-semibold text-ink-900 tabular-nums tracking-tightest leading-none bg-transparent outline-none w-20"
                                        />
                                        <button onClick={saveCensus} disabled={busy} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 disabled:opacity-60">Save</button>
                                    </div>
                                    <p className="text-[11px] text-ink-500 mt-1">Roster has {sheet.residentsActive} active</p>
                                </div>
                                <div className="hidden print:block bg-white border border-ink-200 rounded-2xl p-4">
                                    <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Census</span>
                                    <p className="font-display text-[24px] font-semibold text-ink-900 tabular-nums tracking-tightest">{sheet.census?.count ?? sheet.residentsActive}</p>
                                </div>
                                <div className="bg-white border border-ink-200 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Utensils className="w-3.5 h-3.5 text-ink-500" />
                                        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">Dishes today</span>
                                    </div>
                                    <p className="font-display text-[24px] font-semibold text-ink-900 tabular-nums tracking-tightest">{sheet.dishes.length}</p>
                                </div>
                            </div>

                            {/* Diet modification summary */}
                            <div className="bg-white border border-ink-200 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                                    <h2 className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">Dietary modifications</h2>
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                    <ModStat label="Diabetic" count={sheet.modSummary.diabetic} />
                                    <ModStat label="Low sodium" count={sheet.modSummary.lowSodium} />
                                    <ModStat label="Renal" count={sheet.modSummary.renal} />
                                    <ModStat label="Cardiac" count={sheet.modSummary.cardiac} />
                                    <ModStat label="Gluten-free" count={sheet.modSummary.glutenFree} />
                                    <ModStat label="Vegetarian" count={sheet.modSummary.vegetarian} />
                                    <ModStat label="Mech. soft" count={sheet.modSummary.mechanicalSoft} />
                                    <ModStat label="Pureed" count={sheet.modSummary.pureed} />
                                    <ModStat label="Thick. liq." count={sheet.modSummary.thickenedLiquids} />
                                </div>

                                {sheet.modSummary.allergens.length > 0 && (
                                    <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-rose-700">Allergens on roster</span>
                                        </div>
                                        <div className="space-y-1">
                                            {sheet.modSummary.allergens.map((a, i) => (
                                                <div key={i} className="text-[12px] text-ink-800">
                                                    <strong className="font-semibold">{a.resident}</strong>{a.room ? ` (${a.room})` : ''}: <span className="text-rose-700">{a.allergens}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dish-by-dish prep list */}
                            <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-ink-100">
                                    <h2 className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">Production list</h2>
                                </div>
                                {sheet.dishes.length === 0 ? (
                                    <div className="px-6 py-12 text-center text-[12.5px] text-ink-500">No menu items planned for this day.</div>
                                ) : (
                                    <div className="divide-y divide-ink-100">
                                        {sheet.dishes.map(d => (
                                            <div key={d.mealPlanId} className="px-5 py-4">
                                                <div className="flex items-baseline justify-between mb-2">
                                                    <div>
                                                        <span className="font-display text-[15px] font-semibold text-ink-900 tracking-tight">{d.menuItemName}</span>
                                                        {d.category && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">{d.category}</span>}
                                                    </div>
                                                    <span className="font-display text-[18px] font-semibold text-ink-900 tabular-nums tracking-tightest">{d.servings} <span className="text-[11px] font-medium text-ink-500">servings</span></span>
                                                </div>
                                                <table className="w-full text-[12.5px]">
                                                    <thead className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-500 text-left">
                                                        <tr><th className="py-1 font-semibold">Ingredient</th><th className="py-1 text-right font-semibold">Total qty</th></tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-ink-100/70">
                                                        {d.ingredients.map((ing, i) => (
                                                            <tr key={i}>
                                                                <td className="py-1.5 text-ink-800">{ing.productName}</td>
                                                                <td className="py-1.5 text-right tabular-nums font-medium text-ink-900">{ing.qtyTotal.toFixed(2)} {ing.unit}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

function ModStat({ label, count }: { label: string; count: number }) {
    const tone = count > 0 ? 'text-ink-900' : 'text-ink-300';
    return (
        <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">{label}</p>
            <p className={`font-display text-[20px] font-semibold tabular-nums tracking-tightest leading-none mt-1 ${tone}`}>{count}</p>
        </div>
    );
}
