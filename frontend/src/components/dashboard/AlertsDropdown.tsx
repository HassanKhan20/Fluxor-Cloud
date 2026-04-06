import { useState, useEffect, useRef } from 'react';
import { Bell, Package, TrendingDown, DollarSign, X, Check, RefreshCw, Info } from 'lucide-react';
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
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen) fetchAlerts();
    }, [isOpen]);

    useEffect(() => {
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
            setAlerts(alerts.map(a => a.id === alertId ? { ...a, isRead: true } : a));
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
                return <Package size={16} className="text-red-500" />;
            case 'overstock':
                return <Package size={16} className="text-amber-500" />;
            case 'vendor_drop':
                return <TrendingDown size={16} className="text-orange-500" />;
            case 'sales_decline':
                return <TrendingDown size={16} className="text-red-500" />;
            case 'pricing_risk':
                return <DollarSign size={16} className="text-amber-500" />;
            default:
                return <Info size={16} className="text-blue-500" />;
        }
    };

    const getPriorityStyles = (priority: Alert['priority']) => {
        switch (priority) {
            case 'critical':
                return 'border-l-red-500 bg-red-50';
            case 'warning':
                return 'border-l-amber-400 bg-amber-50';
            case 'info':
                return 'border-l-blue-400 bg-blue-50';
            default:
                return 'border-l-gray-300 bg-gray-50';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Alerts"
            >
                <Bell size={20} className="text-gray-500" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">Alerts</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleGenerateAlerts}
                                disabled={loading}
                                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                                title="Refresh alerts"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Alert List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading && alerts.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                <p className="text-sm">Loading alerts...</p>
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Check size={24} className="text-green-500" />
                                </div>
                                <p className="text-gray-500 text-sm">All clear! No alerts right now.</p>
                                <button
                                    onClick={handleGenerateAlerts}
                                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Check for new alerts
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`px-4 py-3 border-l-[3px] cursor-pointer hover:bg-gray-50 transition-colors ${getPriorityStyles(alert.priority)} ${alert.isRead ? 'opacity-50' : ''}`}
                                        onClick={() => !alert.isRead && handleMarkAsRead(alert.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center">
                                                {getAlertIcon(alert.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                                        {alert.title}
                                                    </h4>
                                                    {!alert.isRead && (
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {alert.message}
                                                </p>
                                                {alert.action && (
                                                    <p className="mt-1.5 text-xs text-blue-600 font-medium">
                                                        {alert.action}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-[11px] text-gray-400">
                                                    {new Date(alert.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
