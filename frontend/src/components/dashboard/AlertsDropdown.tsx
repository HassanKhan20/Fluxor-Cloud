import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Package, TrendingDown, DollarSign, X, Check, RefreshCw } from 'lucide-react';
import type { Alert } from '@/types';
import { api } from '@/lib/api';

export default function AlertsDropdown() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUnreadCount();

        // Poll for new alerts every 60 seconds
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchAlerts();
        }
    }, [isOpen]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token') || '';
            const data = await api.get('/alerts/unread-count', token);
            setUnreadCount(data.count);
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    };

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || '';
            const data = await api.get('/alerts', token);
            setAlerts(data);
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAlerts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || '';
            await api.post('/alerts/generate', {}, token);
            await fetchAlerts();
            await fetchUnreadCount();
        } catch (err) {
            console.error('Failed to generate alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (alertId: string) => {
        try {
            const token = localStorage.getItem('token') || '';
            await api.post(`/alerts/${alertId}/read`, {}, token);
            setAlerts(alerts.map(a =>
                a.id === alertId ? { ...a, isRead: true } : a
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark alert as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token') || '';
            await api.post('/alerts/mark-all-read', {}, token);
            setAlerts(alerts.map(a => ({ ...a, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const getAlertIcon = (type: Alert['type']) => {
        switch (type) {
            case 'low_stock':
                return <Package size={16} className="text-rose-400" />;
            case 'overstock':
                return <Package size={16} className="text-amber-400" />;
            case 'vendor_drop':
                return <TrendingDown size={16} className="text-orange-400" />;
            case 'sales_decline':
                return <TrendingDown size={16} className="text-rose-400" />;
            case 'pricing_risk':
                return <DollarSign size={16} className="text-amber-400" />;
            default:
                return <AlertTriangle size={16} className="text-slate-400" />;
        }
    };

    const getPriorityColor = (priority: Alert['priority']) => {
        switch (priority) {
            case 'critical':
                return 'border-l-rose-500 bg-rose-500/5';
            case 'warning':
                return 'border-l-amber-500 bg-amber-500/5';
            case 'info':
                return 'border-l-blue-500 bg-blue-500/5';
            default:
                return 'border-l-slate-500';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Alerts"
            >
                <Bell size={20} className="text-slate-400" />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} className="text-amber-400" />
                            <h3 className="font-semibold text-white">Alerts</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGenerateAlerts}
                                disabled={loading}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                title="Refresh alerts"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Alert List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading && alerts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                Loading alerts...
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Check size={24} className="text-emerald-400" />
                                </div>
                                <p className="text-slate-400">All clear! No alerts right now.</p>
                                <button
                                    onClick={handleGenerateAlerts}
                                    className="mt-3 text-sm text-violet-400 hover:text-violet-300"
                                >
                                    Check for new alerts
                                </button>
                            </div>
                        ) : (
                            <div>
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`p-4 border-b border-slate-800 border-l-4 cursor-pointer hover:bg-slate-800/50 transition-colors ${getPriorityColor(alert.priority)
                                            } ${alert.isRead ? 'opacity-60' : ''}`}
                                        onClick={() => !alert.isRead && handleMarkAsRead(alert.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getAlertIcon(alert.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium text-white truncate">
                                                        {alert.title}
                                                    </h4>
                                                    {!alert.isRead && (
                                                        <span className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {alert.message}
                                                </p>
                                                <div className="mt-2 text-xs text-emerald-400">
                                                    💡 {alert.action}
                                                </div>
                                                <div className="mt-2 text-xs text-slate-500">
                                                    {new Date(alert.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {alerts.length > 0 && (
                        <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                            <a
                                href="/dashboard/alerts"
                                className="block text-center text-sm text-violet-400 hover:text-violet-300 transition-colors"
                            >
                                View all alerts →
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
