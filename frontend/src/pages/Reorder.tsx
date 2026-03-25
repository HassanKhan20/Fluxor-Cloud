import { useState, useEffect } from 'react';
import { ShoppingCart, Mail, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Copy, X, Truck } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';

interface ReorderItem {
    id: string;
    name: string;
    barcode?: string;
    vendor?: string;
    category?: string;
    currentStock: number;
    reorderPoint: number;
    suggestedQty: number;
    dailyVelocity: number;
    daysRemaining: number;
    estimatedCost: number;
    urgency: 'critical' | 'high' | 'normal';
}

interface VendorSummary {
    vendor: string;
    itemCount: number;
    totalEstimatedCost: number;
    hasCritical: boolean;
}

interface ReorderData {
    items: ReorderItem[];
    totalItems: number;
    totalEstimatedCost: number;
    criticalCount: number;
    byVendor: VendorSummary[];
}

interface EmailDraft {
    subject: string;
    body: string;
    vendorName: string;
    lineItems: { name: string; barcode?: string; qty: number; unitCost: number }[];
    totalCost: number;
}

export default function Reorder() {
    const [data, setData] = useState<ReorderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
    const [showEmail, setShowEmail] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [markingOrdered, setMarkingOrdered] = useState(false);
    const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [orderedIds, setOrderedIds] = useState<Set<string>>(new Set());

    const token = localStorage.getItem('token') || '';

    useEffect(() => { loadReorderList(); }, []);

    const loadReorderList = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reorder', token);
            setData(res);
            if (res.byVendor?.length > 0) {
                setExpandedVendor(res.byVendor[0].vendor);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const toggleItem = (id: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectVendorItems = (vendor: string) => {
        if (!data) return;
        const vendorItems = data.items.filter(i => (i.vendor || 'Unknown Vendor') === vendor);
        const allSelected = vendorItems.every(i => selectedItems.has(i.id));
        setSelectedItems(prev => {
            const next = new Set(prev);
            vendorItems.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
            return next;
        });
    };

    const generateEmail = async (vendor: string) => {
        if (!data) return;
        const vendorItems = data.items.filter(i => (i.vendor || 'Unknown Vendor') === vendor);
        const productIds = vendorItems.map(i => i.id);
        if (productIds.length === 0) return;

        setEmailLoading(true);
        try {
            const res = await api.post('/reorder/email', { vendorName: vendor, productIds }, token);
            setEmailDraft(res);
            setShowEmail(true);
        } catch (e) { console.error(e); }
        setEmailLoading(false);
    };

    const markAsOrdered = async (productIds: string[]) => {
        setMarkingOrdered(true);
        try {
            await api.post('/reorder/mark-ordered', { productIds }, token);
            setOrderedIds(prev => {
                const next = new Set(prev);
                productIds.forEach(id => next.add(id));
                return next;
            });
        } catch (e) { console.error(e); }
        setMarkingOrdered(false);
    };

    const copyEmailToClipboard = () => {
        if (!emailDraft) return;
        navigator.clipboard.writeText(emailDraft.body);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const urgencyBadge = (u: string) => {
        if (u === 'critical') return 'bg-red-100 text-red-700 border-red-200';
        if (u === 'high') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    const urgencyLabel = (u: string) => {
        if (u === 'critical') return 'Critical';
        if (u === 'high') return 'Low';
        return 'Normal';
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingCart size={24} className="text-blue-600" />
                            Reorder Center
                        </h1>
                        <p className="text-gray-500 mt-1">Auto-calculated reorder suggestions based on sales velocity</p>
                    </div>
                    {data && data.totalItems > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">{data.totalItems} items to reorder</p>
                                <p className="text-lg font-bold text-gray-900">${data.totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Critical alert */}
                {data && data.criticalCount > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
                        <p className="text-red-700 font-medium">{data.criticalCount} item{data.criticalCount > 1 ? 's' : ''} will stock out within 3 days</p>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-16 text-gray-400">Loading reorder data...</div>
                ) : !data || data.totalItems === 0 ? (
                    <div className="text-center py-16">
                        <CheckCircle size={48} className="mx-auto mb-4 text-green-500 opacity-40" />
                        <p className="text-green-600 font-medium text-lg">All stocked up!</p>
                        <p className="text-gray-400 mt-1">No items are below their reorder point right now.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Vendor groups */}
                        {data.byVendor.map(vendor => {
                            const vendorItems = data.items.filter(i => (i.vendor || 'Unknown Vendor') === vendor.vendor);
                            const isExpanded = expandedVendor === vendor.vendor;
                            const allSelected = vendorItems.every(i => selectedItems.has(i.id));
                            const allOrdered = vendorItems.every(i => orderedIds.has(i.id));

                            return (
                                <div key={vendor.vendor} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    {/* Vendor header */}
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpandedVendor(isExpanded ? null : vendor.vendor)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${vendor.hasCritical ? 'bg-red-100' : 'bg-blue-100'}`}>
                                                <Truck size={18} className={vendor.hasCritical ? 'text-red-600' : 'text-blue-600'} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{vendor.vendor}</p>
                                                <p className="text-sm text-gray-500">{vendor.itemCount} item{vendor.itemCount > 1 ? 's' : ''} &middot; ~${vendor.totalEstimatedCost.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {allOrdered && (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                                    <CheckCircle size={12} /> Ordered
                                                </span>
                                            )}
                                            {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Expanded items */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100">
                                            {/* Action bar */}
                                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={() => selectVendorItems(vendor.vendor)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    Select all
                                                </label>
                                                <div className="ml-auto flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); generateEmail(vendor.vendor); }}
                                                        disabled={emailLoading}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 bg-white rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                    >
                                                        <Mail size={14} /> {emailLoading ? 'Generating...' : 'Draft Email'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const ids = selectedItems.size > 0
                                                                ? vendorItems.filter(i => selectedItems.has(i.id)).map(i => i.id)
                                                                : vendorItems.map(i => i.id);
                                                            markAsOrdered(ids);
                                                        }}
                                                        disabled={markingOrdered || allOrdered}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                    >
                                                        <CheckCircle size={14} /> {markingOrdered ? 'Saving...' : 'Mark Ordered'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Item rows */}
                                            <div className="divide-y divide-gray-50">
                                                {vendorItems.map(item => (
                                                    <div key={item.id} className={`flex items-center gap-4 px-4 py-3 ${orderedIds.has(item.id) ? 'opacity-50' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.has(item.id)}
                                                            onChange={() => toggleItem(item.id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                {item.barcode && <span className="text-xs text-gray-400">{item.barcode}</span>}
                                                                {item.category && <span className="text-xs text-gray-400">{item.category}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div className="text-center">
                                                                <p className="text-xs text-gray-400">Stock</p>
                                                                <p className="font-medium text-gray-900">{item.currentStock}</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs text-gray-400">Velocity</p>
                                                                <p className="font-medium text-gray-700">{item.dailyVelocity}/day</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs text-gray-400">Days Left</p>
                                                                <p className={`font-bold ${item.daysRemaining <= 3 ? 'text-red-600' : item.daysRemaining <= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                                                                    {item.daysRemaining >= 999 ? '--' : item.daysRemaining}
                                                                </p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs text-gray-400">Order Qty</p>
                                                                <p className="font-bold text-blue-600">{item.suggestedQty}</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs text-gray-400">Est. Cost</p>
                                                                <p className="font-medium text-gray-700">${item.estimatedCost.toFixed(2)}</p>
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${urgencyBadge(item.urgency)}`}>
                                                                {urgencyLabel(item.urgency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Email Draft Modal */}
                {showEmail && emailDraft && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Email Draft</h2>
                                    <p className="text-sm text-gray-500">To: {emailDraft.vendorName} &middot; Est. ${emailDraft.totalCost.toFixed(2)}</p>
                                </div>
                                <button onClick={() => setShowEmail(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    {emailDraft.body}
                                </pre>
                            </div>
                            <div className="flex gap-3 p-6 border-t border-gray-100">
                                <button onClick={() => setShowEmail(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                                    Close
                                </button>
                                <button
                                    onClick={copyEmailToClipboard}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    <Copy size={14} />
                                    {copiedEmail ? 'Copied!' : 'Copy to Clipboard'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
