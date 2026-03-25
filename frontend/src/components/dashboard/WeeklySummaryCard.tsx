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
            <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm animate-pulse">
                <div className="h-5 bg-blue-50 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-blue-50 rounded w-full"></div>
                    <div className="h-4 bg-blue-50 rounded w-2/3"></div>
                    <div className="h-4 bg-blue-50 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
                <div className="text-gray-400 text-center py-4">
                    {error || 'No data available'}
                </div>
            </div>
        );
    }

    const isRevenueUp = summary.revenue.change >= 0;

    return (
        <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                        <BarChart3 size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-blue-900 tracking-tight">Weekly Summary</h2>
                        <p className="text-xs text-gray-400">
                            {new Date(summary.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                            {new Date(summary.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign size={14} className="text-blue-500" />
                        <span className="text-xs text-gray-500">Revenue</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                        ${summary.revenue.amount.toLocaleString()}
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${isRevenueUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isRevenueUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(summary.revenue.changePercent).toFixed(0)}% vs last week
                    </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-xs text-gray-500">Money Wasted</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                        ${summary.moneyWasted.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {summary.moneyWasted.primaryReason}
                    </div>
                </div>
            </div>

            {/* Top & Worst Performer */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                {summary.topProduct && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Star size={12} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Top Performer</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                            {summary.topProduct.name}
                        </div>
                        <div className="text-xs text-gray-500">
                            ${summary.topProduct.revenue.toLocaleString()} revenue
                        </div>
                    </div>
                )}

                {summary.worstPerformer && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <AlertTriangle size={12} className="text-red-400" />
                            <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wide">Needs Attention</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                            {summary.worstPerformer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                            {summary.worstPerformer.reason}
                        </div>
                    </div>
                )}
            </div>

            {/* Recommendations */}
            {summary.recommendations.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-blue-900/60 uppercase tracking-wider mb-2">Recommendations</h3>
                    {summary.recommendations.slice(0, 3).map((rec, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-2.5 rounded-lg p-2.5 border border-blue-50 hover:border-blue-200 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                        >
                            <span className="text-sm text-gray-600 flex-1">{rec}</span>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
