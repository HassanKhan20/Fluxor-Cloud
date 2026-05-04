import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { API_URL } from '@/lib/api';
import { ClipboardCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface CountRow {
    productId: string;
    name: string;
    category: string | null;
    brand: string | null;
    sku: string | null;
    barcode: string | null;
    expectedStock: number;
    sold14d: number;
    lastCountAt: string | null;
    daysSinceCount: number | null;
}

export default function CycleCount() {
    const [rows, setRows] = useState<CountRow[]>([]);
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [variances, setVariances] = useState<{ productId: string; name: string; expected: number; counted: number; variance: number }[] | null>(null);

    async function load() {
        const token = localStorage.getItem('token');
        if (!token) { setError('Not authenticated'); setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/cycle-count/list`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(`Failed (${res.status})`);
            const data = await res.json();
            setRows(data.rows || []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load list');
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); }, []);

    async function submit() {
        const token = localStorage.getItem('token');
        if (!token) return;
        const payload = Object.entries(counts)
            .filter(([, v]) => v !== '' && !isNaN(Number(v)))
            .map(([productId, v]) => ({ productId, counted: Number(v) }));
        if (payload.length === 0) { setError('Enter at least one count'); return; }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/cycle-count/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ counts: payload })
            });
            if (!res.ok) throw new Error(`Failed (${res.status})`);
            const data = await res.json();
            setVariances(data.variances || []);
            setCounts({});
            load();
        } catch (e: any) {
            setError(e?.message || 'Submit failed');
        } finally { setSubmitting(false); }
    }

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-700 mb-1">
                            <ClipboardCheck className="w-3 h-3" /> Cycle Count
                        </div>
                        <h1 className="text-2xl font-display font-semibold text-ink-900 tracking-tight">High-Shrink Count</h1>
                        <p className="mt-1.5 text-[14px] text-ink-600 max-w-2xl">
                            Tobacco, lottery, and energy drinks drift the most. Count just these tonight — under 5 minutes — and we'll save a fresh inventory snapshot.
                        </p>
                    </div>
                    <button onClick={load} className="p-2 text-ink-500 hover:text-ink-900" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 mb-4 text-[13px] flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {variances && variances.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <h3 className="text-[14px] font-semibold text-emerald-900">Saved {variances.length} count{variances.length === 1 ? '' : 's'}</h3>
                        </div>
                        <ul className="space-y-1">
                            {variances.map(v => (
                                <li key={v.productId} className="flex items-center justify-between text-[12.5px] font-mono">
                                    <span className="text-emerald-900">{v.name}</span>
                                    <span className={v.variance === 0 ? 'text-ink-500' : v.variance < 0 ? 'text-rose-700' : 'text-amber-700'}>
                                        {v.variance > 0 ? '+' : ''}{v.variance} (counted {v.counted}, expected {v.expected})
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {loading ? (
                    <div className="text-[13px] text-ink-500">Loading…</div>
                ) : rows.length === 0 ? (
                    <div className="bg-white border border-ink-200 rounded-2xl p-8 text-center">
                        <p className="text-[14px] text-ink-600">No high-shrink products found yet. Tag tobacco / lottery / energy SKUs with a matching name or category to populate this list.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop: dense table. Hidden on mobile because tables don't
                            fit a phone screen and this is exactly the device an owner
                            uses on the floor. */}
                        <div className="hidden sm:block bg-white border border-ink-200 rounded-2xl overflow-hidden mb-5">
                            <table className="w-full text-[13px]">
                                <thead className="bg-ink-50 text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500">
                                    <tr>
                                        <th className="text-left px-4 py-2.5">Product</th>
                                        <th className="text-right px-3 py-2.5">Expected</th>
                                        <th className="text-right px-3 py-2.5">Sold (14d)</th>
                                        <th className="text-right px-3 py-2.5">Last Count</th>
                                        <th className="text-right px-4 py-2.5 w-24">Counted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(r => (
                                        <tr key={r.productId} className="border-t border-ink-100">
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium text-ink-900">{r.name}</div>
                                                <div className="text-[11px] text-ink-500">{r.category || r.brand || '—'}</div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono text-ink-700">{r.expectedStock}</td>
                                            <td className="px-3 py-2.5 text-right font-mono text-ink-700">{r.sold14d}</td>
                                            <td className="px-3 py-2.5 text-right font-mono text-ink-500">
                                                {r.daysSinceCount === null ? 'never' : `${r.daysSinceCount}d ago`}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={0}
                                                    value={counts[r.productId] ?? ''}
                                                    onChange={e => setCounts(prev => ({ ...prev, [r.productId]: e.target.value }))}
                                                    placeholder="—"
                                                    className="w-full text-right border border-ink-200 rounded-md px-2 py-1 text-[13px] font-mono focus:outline-none focus:border-emerald-400"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile: stacked card per product with a large input.
                            Designed for one-thumb use during a Sunday-night count. */}
                        <div className="sm:hidden space-y-2.5 mb-5">
                            {rows.map(r => (
                                <div key={r.productId} className="bg-white border border-ink-200 rounded-2xl p-3.5">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-ink-900 text-[15px] leading-snug">{r.name}</div>
                                            <div className="text-[11.5px] text-ink-500 mt-0.5">{r.category || r.brand || '—'}</div>
                                        </div>
                                        <div className="text-right text-[10.5px] font-mono uppercase tracking-[0.1em] text-ink-400 flex-shrink-0">
                                            {r.daysSinceCount === null ? 'never counted' : `${r.daysSinceCount}d since`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 grid grid-cols-2 gap-2 text-[12px]">
                                            <div className="bg-ink-50 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-500">Expected</div>
                                                <div className="font-mono font-semibold text-ink-900 text-[14px]">{r.expectedStock}</div>
                                            </div>
                                            <div className="bg-ink-50 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-500">Sold 14d</div>
                                                <div className="font-mono font-semibold text-ink-900 text-[14px]">{r.sold14d}</div>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            value={counts[r.productId] ?? ''}
                                            onChange={e => setCounts(prev => ({ ...prev, [r.productId]: e.target.value }))}
                                            placeholder="Count"
                                            className="w-24 h-12 text-center border-2 border-ink-200 rounded-xl text-[18px] font-mono font-semibold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sticky save bar on mobile — always reachable with the thumb */}
                        <div className="sticky bottom-0 sm:static bg-white sm:bg-transparent border-t sm:border-0 border-ink-200 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 flex items-center justify-between sm:justify-end gap-3">
                            <span className="text-[12.5px] text-ink-500 font-mono">
                                {Object.values(counts).filter(v => v !== '' && !isNaN(Number(v))).length} ready
                            </span>
                            <button
                                onClick={submit}
                                disabled={submitting}
                                className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-ink-300 text-white font-semibold text-[14px] transition-colors"
                            >
                                {submitting ? 'Saving…' : 'Save Counts'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
