import { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown, Archive, Trash2, ChevronDown, ChevronUp, Info, Lightbulb } from 'lucide-react';
import type { MoneyWastedBreakdown } from '@/types';
import { api } from '@/lib/api';

export default function MoneyWastedCard() {
    const [breakdown, setBreakdown] = useState<MoneyWastedBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetchBreakdown();
    }, []);

    const fetchBreakdown = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || '';
            const data = await api.get('/dashboard/money-wasted', token);
            setBreakdown(data);
        } catch (err) {
            setError('Failed to load breakdown');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-slate-700 rounded mb-4"></div>
                <div className="grid grid-cols-4 gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !breakdown) {
        return (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50">
                <div className="text-slate-400 text-center py-4">
                    {error || 'No data available'}
                </div>
            </div>
        );
    }

    const categoryData = [
        {
            key: 'deadStock',
            label: 'Dead Stock',
            description: 'No sales in 90 days',
            icon: Trash2,
            color: 'rose',
            data: breakdown.breakdown.deadStock
        },
        {
            key: 'overstock',
            label: 'Overstock',
            description: '>60 days of inventory',
            icon: Archive,
            color: 'amber',
            data: breakdown.breakdown.overstock
        },
        {
            key: 'slowMovers',
            label: 'Slow Movers',
            description: 'Very low sales velocity',
            icon: TrendingDown,
            color: 'orange',
            data: breakdown.breakdown.slowMovers
        },
        {
            key: 'shrinkLoss',
            label: 'Shrink/Loss',
            description: 'Theft, damage, expiry',
            icon: Package,
            color: 'purple',
            data: breakdown.breakdown.shrinkLoss
        }
    ];

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Money Wasted</h2>
                        <p className="text-xs text-slate-400">Where your inventory is losing value</p>
                    </div>
                </div>

                {/* Total Amount Badge */}
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
                    <span className="text-2xl font-bold text-rose-400">
                        ${breakdown.total.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Explanation */}
            <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-700/30">
                <div className="flex items-start gap-2">
                    <Info size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">{breakdown.explanation}</p>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {categoryData.map((cat) => {
                    const Icon = cat.icon;
                    const percentage = breakdown.total > 0
                        ? (cat.data.amount / breakdown.total) * 100
                        : 0;

                    return (
                        <div
                            key={cat.key}
                            className={`rounded-xl p-3 border ${cat.color === 'rose' ? 'bg-rose-500/10 border-rose-500/20' :
                                cat.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' :
                                    cat.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' :
                                        'bg-purple-500/10 border-purple-500/20'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={14} className={
                                    cat.color === 'rose' ? 'text-rose-400' :
                                        cat.color === 'amber' ? 'text-amber-400' :
                                            cat.color === 'orange' ? 'text-orange-400' :
                                                'text-purple-400'
                                } />
                                <span className="text-xs font-medium text-slate-300">{cat.label}</span>
                            </div>
                            <div className="text-lg font-bold text-white">
                                ${cat.data.amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500">
                                {cat.data.productCount} product{cat.data.productCount !== 1 ? 's' : ''}
                            </div>

                            {/* Mini progress bar */}
                            <div className="h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${cat.color === 'rose' ? 'bg-rose-500' :
                                        cat.color === 'amber' ? 'bg-amber-500' :
                                            cat.color === 'orange' ? 'bg-orange-500' :
                                                'bg-purple-500'
                                        }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Top Causes (Expandable) */}
            {breakdown.topCauses.length > 0 && (
                <div className="border-t border-slate-700/50 pt-4">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-300 transition-colors"
                    >
                        <span className="font-medium">Top Causes & Actions</span>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expanded && (
                        <div className="mt-3 space-y-2">
                            {breakdown.topCauses.map((cause, index) => (
                                <div
                                    key={index}
                                    className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-sm text-white font-medium">
                                            {cause.description}
                                        </span>
                                        <span className="text-sm font-bold text-rose-400">
                                            ${cause.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                            <Lightbulb className="w-3 h-3" />
                                            {cause.action}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
