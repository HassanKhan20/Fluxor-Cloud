// Tray tickets — one printable slip per resident, with diet flags and per-item
// allergen warnings. Designed for printing on a sheet of small labels or a
// continuous tape printer near the tray line.

import { useEffect, useState } from 'react';
import { Printer, AlertTriangle, Coffee, Utensils, Cake } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { retirementApi, type TrayTicket } from '@/lib/retirementApi';

const MEAL_OPTIONS: { value: 'breakfast' | 'lunch' | 'dinner'; label: string; icon: React.ReactNode }[] = [
    { value: 'breakfast', label: 'Breakfast', icon: <Coffee className="w-3.5 h-3.5" /> },
    { value: 'lunch',     label: 'Lunch',     icon: <Utensils className="w-3.5 h-3.5" /> },
    { value: 'dinner',    label: 'Dinner',    icon: <Cake className="w-3.5 h-3.5" /> },
];

export default function TrayTicketsPage() {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [meal, setMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
    const [tickets, setTickets] = useState<TrayTicket[]>([]);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        try {
            const r = await retirementApi.getTrayTickets(date, meal);
            setTickets(r.tickets);
        } finally { setLoading(false); }
    }
    useEffect(() => { refresh(); }, [date, meal]);

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-ink-100/60 font-sans print:bg-white">
                <div className="max-w-[1200px] mx-auto p-6 lg:p-8 space-y-5 print:p-0">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 print:hidden">
                        <div>
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Kitchen</p>
                            <h1 className="font-display text-3xl font-semibold text-ink-900 tracking-tightest mt-1.5">Tray Tickets</h1>
                            <p className="text-[13.5px] text-ink-600 mt-1.5">One slip per resident with their diet flags, plus per-item allergen warnings derived from each resident's profile.</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white border border-ink-200 rounded-lg px-3 py-2 text-[13px]" />
                            <div className="bg-white border border-ink-200 rounded-lg px-1 py-1 inline-flex">
                                {MEAL_OPTIONS.map(m => (
                                    <button key={m.value} onClick={() => setMeal(m.value)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium ${meal === m.value ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'}`}>
                                        {m.icon}{m.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-900 hover:bg-ink-800 px-3.5 py-2 rounded-lg">
                                <Printer className="w-3.5 h-3.5" /> Print all
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-[13px] text-ink-500">Loading tickets…</div>
                    ) : tickets.length === 0 ? (
                        <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-[13px] text-ink-500">
                            No active residents yet. Add residents on the <a className="text-indigo-600 hover:text-indigo-700" href="/residents">Residents</a> page.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2 print:gap-2">
                            {tickets.map(t => <Ticket key={t.residentId} t={t} meal={meal} />)}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

function Ticket({ t, meal }: { t: TrayTicket; meal: string }) {
    const flags: string[] = [];
    if (t.diet?.diabetic) flags.push('DIABETIC');
    if (t.diet?.lowSodium) flags.push('LOW SODIUM');
    if (t.diet?.renal) flags.push('RENAL');
    if (t.diet?.cardiac) flags.push('CARDIAC');
    if (t.diet?.glutenFree) flags.push('GLUTEN-FREE');
    if (t.diet?.vegetarian) flags.push('VEGETARIAN');
    if (t.diet?.texture && t.diet.texture !== 'regular') flags.push(t.diet.texture.replace('_', ' ').toUpperCase());

    return (
        <div className="bg-white border-2 border-ink-900 rounded-xl p-4 break-inside-avoid print:shadow-none">
            <div className="flex items-baseline justify-between border-b-2 border-ink-900 pb-2 mb-2">
                <div>
                    <div className="font-display text-[16px] font-bold text-ink-900 tracking-tight leading-tight">{t.residentName}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-600 mt-0.5">{t.room ? `Room ${t.room}` : 'No room'} · {meal}</div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>

            {flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {flags.map(f => (
                        <span key={f} className="text-[9.5px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded border-2 border-ink-900 text-ink-900">{f}</span>
                    ))}
                </div>
            )}

            {t.diet?.allergens && (
                <div className="bg-rose-100 border-2 border-rose-700 rounded-md px-2 py-1 mb-2">
                    <div className="flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-rose-900">
                        <AlertTriangle className="w-3 h-3" /> Allergen
                    </div>
                    <div className="text-[12px] font-bold text-rose-900">{t.diet.allergens}</div>
                </div>
            )}

            <div className="space-y-1">
                {t.items.length === 0 ? (
                    <div className="text-[11px] text-ink-400 italic">No items planned.</div>
                ) : t.items.map((it, i) => (
                    <div key={i} className="border-b border-ink-100 pb-1 last:border-0">
                        <div className="text-[13px] font-semibold text-ink-900 tracking-tight">{it.name}</div>
                        {it.warnings.length > 0 && (
                            <div className="text-[10.5px] text-rose-700 font-semibold mt-0.5">
                                {it.warnings.map((w, j) => <span key={j} className="block">{w}</span>)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {t.diet?.dislikes && (
                <div className="mt-2 pt-2 border-t border-ink-200 text-[10.5px] text-ink-600">
                    <span className="font-semibold">Avoid:</span> {t.diet.dislikes}
                </div>
            )}
            {t.diet?.preferences && (
                <div className="mt-1 text-[10.5px] text-ink-600">
                    <span className="font-semibold">Prefer:</span> {t.diet.preferences}
                </div>
            )}
        </div>
    );
}
