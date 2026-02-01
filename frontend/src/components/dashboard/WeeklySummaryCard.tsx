import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Star, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react';
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
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-slate-700 rounded w-full"></div>
                    <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50">
                <div className="text-slate-400 text-center py-4">
                    {error || 'No data available'}
                </div>
            </div>
        );
    }

    const isRevenueUp = summary.revenue.change >= 0;

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Lightbulb size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Your Weekly Summary</h2>
                        <p className="text-xs text-slate-400">
                            {new Date(summary.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -
                            {new Date(summary.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Revenue */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-emerald-400" />
                        <span className="text-sm text-slate-400">Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        ${summary.revenue.amount.toLocaleString()}
                    </div>
                    <div className={`flex items-center gap-1 text-sm mt-1 ${isRevenueUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                        {isRevenueUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(summary.revenue.changePercent).toFixed(0)}% vs last week
                    </div>
                </div>

                {/* Money Wasted */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <span className="text-sm text-slate-400">Money Wasted</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        ${summary.moneyWasted.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {summary.moneyWasted.primaryReason}
                    </div>
                </div>
            </div>

            {/* Top & Worst Performer */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Top Performer */}
                {summary.topProduct && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Star size={14} className="text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">TOP PERFORMER</span>
                        </div>
                        <div className="text-sm font-medium text-white truncate">
                            {summary.topProduct.name}
                        </div>
                        <div className="text-xs text-slate-400">
                            ${summary.topProduct.revenue.toLocaleString()} revenue
                        </div>
                    </div>
                )}

                {/* Worst Performer */}
                {summary.worstPerformer && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={14} className="text-rose-400" />
                            <span className="text-xs text-rose-400 font-medium">NEEDS ATTENTION</span>
                        </div>
                        <div className="text-sm font-medium text-white truncate">
                            {summary.worstPerformer.name}
                        </div>
                        <div className="text-xs text-slate-400">
                            {summary.worstPerformer.reason}
                        </div>
                    </div>
                )}
            </div>

            {/* Recommendations */}
            {summary.recommendations.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">💡 Recommendations</h3>
                    {summary.recommendations.slice(0, 3).map((rec, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-3 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 hover:border-violet-500/30 transition-colors cursor-pointer group"
                        >
                            <span className="text-sm text-slate-300 flex-1">{rec}</span>
                            <ChevronRight size={16} className="text-slate-500 group-hover:text-violet-400 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
