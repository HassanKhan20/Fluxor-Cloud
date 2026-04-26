// Tablet-optimized "log a meal served" flow.
// Designed for a wall-mounted tablet in the kitchen — big tap targets,
// minimal text, single-tap increments, undo for fat-finger mistakes.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Plus, Minus, Coffee, UtensilsCrossed, Cake, ChefHat } from 'lucide-react';
import { kitchenApi, type MenuItem } from '@/lib/kitchenApi';

const CATEGORY_ICON: Record<string, React.ReactNode> = {
    breakfast: <Coffee className="w-4 h-4" />,
    entree: <UtensilsCrossed className="w-4 h-4" />,
    side: <ChefHat className="w-4 h-4" />,
    dessert: <Cake className="w-4 h-4" />,
};

export default function KitchenLogger() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [recentlyLogged, setRecentlyLogged] = useState<{ id: string; name: string; ts: number }[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const r = await kitchenApi.listMenuItems();
                setItems(r.menuItems || []);
            } finally { setLoading(false); }
        })();
    }, []);

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
            <header className="bg-ink-900/80 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <Link to="/kitchen" className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Link>
                <div className="text-center">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-indigo-300">Tablet logger</p>
                    <h1 className="font-display text-[18px] font-semibold tracking-tight">Tap a dish each time it's served</h1>
                </div>
                <div className="text-right text-[12px] text-white/60 tabular-nums">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
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
