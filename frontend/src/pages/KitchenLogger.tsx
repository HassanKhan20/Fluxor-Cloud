// Tablet-optimized "log a meal served" flow.
// Designed for a wall-mounted tablet in the kitchen — big tap targets,
// minimal text, single-tap increments, undo for fat-finger mistakes.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Plus, Minus, Coffee, UtensilsCrossed, Cake, ChefHat, ListChecks, MousePointerClick, Send } from 'lucide-react';
import { kitchenApi, type MenuItem } from '@/lib/kitchenApi';
import { retirementApi } from '@/lib/retirementApi';

const CATEGORY_ICON: Record<string, React.ReactNode> = {
    breakfast: <Coffee className="w-4 h-4" />,
    entree: <UtensilsCrossed className="w-4 h-4" />,
    side: <ChefHat className="w-4 h-4" />,
    dessert: <Cake className="w-4 h-4" />,
};

type Mode = 'tap' | 'tally';

export default function KitchenLogger() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [recentlyLogged, setRecentlyLogged] = useState<{ id: string; name: string; ts: number }[]>([]);
    const [mode, setMode] = useState<Mode>('tap');
    // Bulk-tally state — typed counts per dish, submit once at end of meal
    const [tally, setTally] = useState<Record<string, string>>({});
    const [tallyBusy, setTallyBusy] = useState(false);
    const [tallyMsg, setTallyMsg] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const r = await kitchenApi.listMenuItems();
                setItems(r.menuItems || []);
            } finally { setLoading(false); }
        })();
    }, []);

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

    async function submitTally() {
        const entries = Object.entries(tally)
            .map(([menuItemId, v]) => ({ menuItemId, servings: parseInt(v) || 0 }))
            .filter(e => e.servings > 0);
        if (entries.length === 0) {
            setTallyMsg('Enter at least one count');
            setTimeout(() => setTallyMsg(null), 2000);
            return;
        }
        setTallyBusy(true);
        try {
            const r = await retirementApi.bulkLogMeals(today, entries);
            setTallyMsg(r.message || 'Logged');
            setTally({});
            setTimeout(() => setTallyMsg(null), 3500);
        } catch (e: any) {
            setTallyMsg(e.message || 'Failed to log');
            setTimeout(() => setTallyMsg(null), 3500);
        } finally {
            setTallyBusy(false);
        }
    }

    async function bump(item: MenuItem, delta: 1 | -1) {
        // Optimistic local count
        setCounts(c => ({ ...c, [item.id]: Math.max(0, (c[item.id] || 0) + delta) }));
        if (delta === 1) {
            try {
                await kitchenApi.logMealServed(item.id, today, 1);
                setRecentlyLogged(prev => [{ id: `${item.id}-${Date.now()}`, name: item.name, ts: Date.now() }, ...prev].slice(0, 6));
            } catch {
                // Roll back on failure
                setCounts(c => ({ ...c, [item.id]: Math.max(0, (c[item.id] || 0) - 1) }));
            }
        }
    }

    const grouped = useMemo(() => {
        const m = new Map<string, MenuItem[]>();
        for (const i of items.filter(x => x.isActive)) {
            const key = i.category || 'other';
            if (!m.has(key)) m.set(key, []);
            m.get(key)!.push(i);
        }
        return m;
    }, [items]);

    return (
        <div className="min-h-screen bg-ink-950 text-white font-sans">
            {/* Top bar */}
            <header className="bg-ink-900/80 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                <Link to="/kitchen" className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Link>
                <div className="text-center">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-indigo-300">Tablet logger</p>
                    <h1 className="font-display text-[18px] font-semibold tracking-tight">
                        {mode === 'tap' ? "Tap a dish each time it's served" : 'Type end-of-meal counts'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    {/* Mode switcher */}
                    <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                            onClick={() => setMode('tap')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${mode === 'tap' ? 'bg-indigo-600 text-white' : 'text-white/70 hover:text-white'}`}
                        >
                            <MousePointerClick className="w-3 h-3" /> Tap
                        </button>
                        <button
                            onClick={() => setMode('tally')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${mode === 'tally' ? 'bg-emerald-600 text-white' : 'text-white/70 hover:text-white'}`}
                        >
                            <ListChecks className="w-3 h-3" /> Bulk tally
                        </button>
                    </div>
                    <div className="text-[12px] text-white/60 tabular-nums">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </header>

            <main className="p-6 max-w-6xl mx-auto">
                {loading ? (
                    <div className="text-center py-16 text-white/60">Loading menu…</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-white/80 text-[15px]">No menu items defined yet.</p>
                        <Link to="/kitchen" className="text-indigo-300 hover:text-indigo-200 text-[13px] mt-2 inline-block">Set up menu items →</Link>
                    </div>
                ) : mode === 'tally' ? (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <p className="text-[13px] text-white/70 mb-4">
                                Use this when residents pick from a paper sheet. Type the count for each dish, then submit once at the end of the meal.
                            </p>
                            <div className="space-y-2">
                                {Array.from(grouped.entries()).flatMap(([_, dishes]) => dishes).map(d => (
                                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-display text-[15px] font-semibold tracking-tight truncate">{d.name}</div>
                                            <div className="text-[11px] text-white/50 capitalize">{d.category || 'other'} · target {d.defaultServings}</div>
                                        </div>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min="0"
                                            placeholder="0"
                                            value={tally[d.id] ?? ''}
                                            onChange={e => setTally(t => ({ ...t, [d.id]: e.target.value }))}
                                            className="w-24 h-12 bg-white/5 border border-white/10 rounded-xl text-center font-display text-[20px] font-bold tabular-nums text-white outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={submitTally}
                                disabled={tallyBusy}
                                className="mt-5 w-full flex items-center justify-center gap-2 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display text-[15px] font-semibold tracking-tight shadow-[0_0_24px_-5px_rgba(16,185,129,0.6)] disabled:opacity-60 transition-colors"
                            >
                                <Send className="w-4 h-4" /> {tallyBusy ? 'Submitting…' : 'Submit tally'}
                            </button>
                            {tallyMsg && (
                                <p className="text-center text-[13px] text-emerald-300 mt-3">{tallyMsg}</p>
                            )}
                            <p className="text-center text-[11px] text-white/40 mt-4">
                                Each count fires recipe deductions for that dish — same effect as tapping {' '}<kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">+</kbd> N times in Tap mode.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Array.from(grouped.entries()).map(([category, dishes]) => (
                            <section key={category}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-7 h-7 rounded-lg bg-white/10 text-indigo-200 flex items-center justify-center">
                                        {CATEGORY_ICON[category] || <UtensilsCrossed className="w-4 h-4" />}
                                    </span>
                                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{category}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {dishes.map(d => {
                                        const c = counts[d.id] || 0;
                                        return (
                                            <div key={d.id} className="bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl p-4 transition-colors">
                                                <div className="font-display text-[16px] font-semibold leading-tight tracking-tight mb-1">{d.name}</div>
                                                <div className="text-[11.5px] text-white/50 tabular-nums">{d.recipes.length} ingredients · target {d.defaultServings}</div>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <button
                                                        onClick={() => bump(d, -1)}
                                                        className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                                                        aria-label="Undo last"
                                                    >
                                                        <Minus className="w-5 h-5" />
                                                    </button>
                                                    <div className="flex-1 text-center">
                                                        <div className="font-display text-[28px] font-bold tabular-nums tracking-tightest text-white">{c}</div>
                                                        <div className="text-[10.5px] uppercase tracking-[0.16em] text-white/40">served</div>
                                                    </div>
                                                    <button
                                                        onClick={() => bump(d, 1)}
                                                        className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-colors shadow-[0_0_20px_-5px_rgba(79,70,229,0.6)]"
                                                        aria-label="Log one served"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {recentlyLogged.length > 0 && (
                    <div className="mt-10 border-t border-white/10 pt-5">
                        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-2">Recently logged</p>
                        <div className="flex flex-wrap gap-2">
                            {recentlyLogged.map(r => (
                                <span key={r.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11.5px] font-medium">
                                    <Check className="w-3 h-3" /> {r.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
