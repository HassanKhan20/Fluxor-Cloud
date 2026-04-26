import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Star, AlertTriangle, BarChart3, ChevronRight } from 'lucide-react';
import type { WeeklySummary } from '@/types';
import { api } from '@/lib/api';

export default function WeeklySummaryCard() {
    const [summary, setSummary] = useState<WeeklySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || '';
            const data = await api.get('/dashboard/weekly-summary', token);
            setSummary(data);
        } catch (err) {
            setError('Failed to load weekly summary');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-ink-200 animate-pulse">
                <div className="h-5 bg-ink-100 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-ink-100 rounded w-full"></div>
                    <div className="h-4 bg-ink-100 rounded w-2/3"></div>
                    <div className="h-4 bg-ink-100 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-ink-200">
                <div className="text-ink-400 text-center py-4 text-[13px]">
                    {error || 'No data available'}
                </div>
            </div>
        );
    }

    const isRevenueUp = summary.revenue.change >= 0;

    return (
        <div className="bg-white rounded-2xl p-6 border border-ink-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <BarChart3 size={16} />
                    </span>
                    <div>
                        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">Weekly Recap</p>
                        <h2 className="font-display text-[14px] font-semibold text-ink-900 tracking-tight mt-0.5">
                            {new Date(summary.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(summary.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
                <div className="bg-ink-50 border border-ink-200 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign size={12} className="text-indigo-500" />
                        <span className="font-mono text-[9.5px] text-ink-500 font-semibold uppercase tracking-[0.12em]">Revenue</span>
                    </div>
                    <div className="font-display text-[18px] font-semibold text-ink-900 tabular-nums tracking-tightest">
                        ${summary.revenue.amount.toLocaleString()}
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] mt-1 tabular-nums font-medium ${isRevenueUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isRevenueUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {Math.abs(summary.revenue.changePercent).toFixed(0)}% <span className="text-ink-400 font-normal">vs last week</span>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span className="font-mono text-[9.5px] text-amber-700 font-semibold uppercase tracking-[0.12em]">Money Wasted</span>
                    </div>
                    <div className="font-display text-[18px] font-semibold text-ink-900 tabular-nums tracking-tightest">
                        ${summary.moneyWasted.total.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-ink-500 mt-1 line-clamp-1">
                        {summary.moneyWasted.primaryReason}
                    </div>
                </div>
            </div>

            {/* Top & Worst Performer */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
                {summary.topProduct && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Star size={11} className="text-emerald-500" />
                            <span className="font-mono text-[9.5px] text-emerald-700 font-semibold uppercase tracking-[0.12em]">Top Performer</span>
                        </div>
                        <div className="text-[13px] font-semibold text-ink-900 truncate tracking-tight">
                            {summary.topProduct.name}
                        </div>
                        <div className="text-[11.5px] text-ink-500 tabular-nums mt-0.5">
                            ${summary.topProduct.revenue.toLocaleString()} revenue
                        </div>
                    </div>
                )}

                {summary.worstPerformer && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <AlertTriangle size={11} className="text-rose-500" />
                            <span className="font-mono text-[9.5px] text-rose-700 font-semibold uppercase tracking-[0.12em]">Needs Attention</span>
                        </div>
                        <div className="text-[13px] font-semibold text-ink-900 truncate tracking-tight">
                            {summary.worstPerformer.name}
                        </div>
                        <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-1">
                            {summary.worstPerformer.reason}
                        </div>
                    </div>
                )}
            </div>

            {/* Recommendations */}
            {summary.recommendations.length > 0 && (
                <div>
                    <h3 className="font-mono text-[10.5px] font-semibold text-ink-500 uppercase tracking-[0.12em] mb-2">Recommendations</h3>
                    <div className="space-y-1.5">
                        {summary.recommendations.slice(0, 3).map((rec, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-2.5 rounded-xl p-2.5 border border-ink-200 bg-ink-50/40 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                            >
                                <span className="text-[12.5px] text-ink-700 flex-1">{rec}</span>
                                <ChevronRight size={13} className="text-ink-300 group-hover:text-indigo-600 transition-colors flex-shrink-0 mt-0.5" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
