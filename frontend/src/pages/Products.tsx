import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { enrichProductsWithAI, categorizeProducts } from '@/lib/aiSuggestions';
import { ProductReviewCard } from '@/components/ProductReviewCard';
import { BulkReviewModal } from '@/components/BulkReviewModal';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    AlertTriangle,
    Package,
    Sparkles,
    DollarSign,
    TrendingDown,
    AlertCircle,
    Download,
    PackagePlus,
    RefreshCw,
    Tag,
    Truck,
    ShoppingCart,
    Upload,
    Printer,
    Calendar,
    Clock,
    PencilLine,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus as PlusIcon,
    Maximize2,
    LayoutGrid,
    List,
    Bell,
    Boxes,
    Layers,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import type { Product } from '@/types';

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center gap-2 group"
    >
        <span className="w-12 h-12 rounded-full bg-white text-indigo-700 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
            {icon}
        </span>
        <span className="text-[11px] font-medium text-white/85 group-hover:text-white tracking-tight whitespace-nowrap">
            {label}
        </span>
    </button>
);

interface KpiCardProps {
    label: string;
    value: string;
    delta?: string;
    deltaTone?: 'green' | 'red' | 'gray';
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, delta, deltaTone = 'green', icon, iconBg, iconColor }) => {
    const toneCls =
        deltaTone === 'green' ? 'text-emerald-600' :
            deltaTone === 'red' ? 'text-rose-600' :
                'text-ink-500';
    return (
        <div className="bg-white border border-ink-200 rounded-2xl p-4 hover:border-ink-300 transition-colors">
            <div className="flex items-start justify-between">
                <p className="text-[12px] font-medium text-ink-600 tracking-tight">{label}</p>
                <ChevronRight className="w-3.5 h-3.5 text-ink-300" />
            </div>
            <div className="flex items-end justify-between mt-3">
                <div className="flex items-center gap-2.5">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}>
                        {icon}
                    </span>
                    <span className="font-display text-3xl font-semibold text-ink-900 tracking-tightest tabular-nums leading-none">
                        {value}
                    </span>
                </div>
                {delta && (
                    <span className={`text-[11px] font-semibold tabular-nums ${toneCls} mb-0.5`}>
                        {delta}
                    </span>
                )}
            </div>
        </div>
    );
};

interface ActivityRowProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle: string;
    badge?: { label: string; tone: 'amber' | 'green' | 'red' | 'indigo' | 'gray' };
}

const ActivityRow: React.FC<ActivityRowProps> = ({ icon, iconBg, title, subtitle, badge }) => {
    const toneClasses = {
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        red: 'bg-rose-50 text-rose-700 border-rose-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        gray: 'bg-ink-100 text-ink-700 border-ink-200',
    };
    return (
        <div className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-ink-50 rounded-lg transition-colors">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${iconBg}`}>
                {icon}
            </span>
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-ink-900 truncate tracking-tight">{title}</div>
                <div className="text-[11.5px] text-ink-500 truncate">{subtitle}</div>
            </div>
            {badge && (
                <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${toneClasses[badge.tone]}`}>
                    {badge.label}
                </span>
            )}
            <button className="p-1 text-ink-400 hover:text-ink-700">
                <span className="block w-1 h-1 rounded-full bg-current shadow-[0_-4px_0_currentColor,0_4px_0_currentColor]" />
            </button>
        </div>
    );
};

export default function Products() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [isBulkReviewOpen, setIsBulkReviewOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [stockProduct, setStockProduct] = useState<Product | null>(null);
    const [stockValue, setStockValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllProducts, setShowAllProducts] = useState(false);
    const isDemoAccount = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.email === 'demo@fluxor.cloud'; } catch { return false; } })();
    const userName = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return (u.name || '').split(' ')[0] || 'there'; } catch { return 'there'; } })();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/products?limit=200', token || '');
            const productList = Array.isArray(data) ? data : (data.products || []);
            const enriched = enrichProductsWithAI(productList);
            setProducts(enriched);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token') || '';
        try {
            if (currentProduct.id) {
                await api.put(`/products/${currentProduct.id}`, currentProduct, token);
            } else {
                await api.post('/products', currentProduct, token);
            }
            setIsDialogOpen(false);
            fetchProducts();
        } catch (error) {
            alert('Failed to save product');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        const token = localStorage.getItem('token') || '';
        try {
            await api.delete(`/products/${id}`, token);
            fetchProducts();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleSetInitialStock = async () => {
        if (!stockProduct || stockValue === '') return;
        const token = localStorage.getItem('token') || '';
        try {
            await api.patch(`/products/${stockProduct.id}/initial-stock`, { initialStock: parseInt(stockValue) }, token);
            setIsStockDialogOpen(false);
            setStockProduct(null);
            setStockValue('');
            fetchProducts();
        } catch (error) {
            alert('Failed to set initial stock');
        }
    };

    const handleConfirmProduct = async (product: Product) => {
        const token = localStorage.getItem('token');
        const suggestions = product.aiSuggestions;

        try {
            const confirmedData: Record<string, any> = {
                action: 'keep',
                name: suggestions?.suggestedName?.value || product.name,
                barcode: product.barcode
            };

            if (suggestions?.suggestedCategory?.value) {
                confirmedData.category = suggestions.suggestedCategory.value;
            } else if (product.category) {
                confirmedData.category = product.category;
            }

            if (suggestions?.suggestedPrice?.value) {
                confirmedData.sellingPrice = suggestions.suggestedPrice.value;
            } else if (product.sellingPrice) {
                confirmedData.sellingPrice = product.sellingPrice;
            }

            await api.post(`/products/${product.id}/match`, confirmedData, token || '');

            if (suggestions?.suggestedMinStock?.value && (product.initialStock === null || product.initialStock === undefined)) {
                await api.patch(`/products/${product.id}/initial-stock`, { initialStock: suggestions.suggestedMinStock.value }, token || '');
            }

            fetchProducts();
        } catch (error) {
            console.error('Failed to confirm product', error);
        }
    };

    const handleBulkConfirmHighConfidence = async () => {
        const { needsReview } = categorizeProducts(products);
        const highConfidence = needsReview.filter(p => {
            const suggestions = p.aiSuggestions;
            if (!suggestions) return false;
            const confidences = [
                suggestions.suggestedName?.confidence,
                suggestions.suggestedCategory?.confidence,
                suggestions.suggestedMinStock?.confidence
            ].filter(Boolean) as number[];
            const avg = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
            return avg >= 85;
        });

        for (const product of highConfidence) {
            await handleConfirmProduct(product);
        }
        setIsBulkReviewOpen(false);
    };

    const openEdit = (product: Product) => {
        setCurrentProduct(product);
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setCurrentProduct({ name: '', barcode: '', sellingPrice: 0, costPrice: 0, category: '', vendor: '' });
        setIsDialogOpen(true);
    };

    const openStockDialog = (product: Product) => {
        setStockProduct(product);
        setStockValue(product.aiSuggestions?.suggestedMinStock?.value?.toString() || product.initialStock?.toString() || '');
        setIsStockDialogOpen(true);
    };

    const handleExport = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/products/export`, { headers: { 'Authorization': `Bearer ${token}` } });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'products_export.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    // Categorize products
    const { needsReview, lowStock, totalRevenueAtRisk } = categorizeProducts(products);
    const allProducts = products.filter(p => !p.isUnmatched);
    const filteredProducts = allProducts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Out of stock count
    const outOfStock = allProducts.filter(p => {
        const qty = p.inventorySnapshots?.[0]?.quantityOnHand ?? p.initialStock ?? 0;
        return qty === 0;
    }).length;

    // Recent activity buckets (computed from current data)
    const recentlyChanged = [...allProducts].slice(0, 4);
    const vendorMap = new Map<string, number>();
    allProducts.forEach(p => {
        if (p.vendor) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + 1);
    });
    const topVendors = Array.from(vendorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const categoryMap = new Map<string, number>();
    allProducts.forEach(p => {
        if (p.category) categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
    });
    const topCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const timeLabel = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-ink-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-ink-500">Loading your inventory...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const initials = (userName || '').slice(0, 1).toUpperCase();

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-ink-100/60 font-sans">
                <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">

                    {/* HERO CARD */}
                    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-7 lg:p-9 shadow-[0_20px_50px_-20px_rgba(79,70,229,0.5)] relative overflow-hidden">
                        {/* Subtle pattern */}
                        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                            backgroundSize: '24px 24px',
                        }} />

                        {/* Top toolbar */}
                        <div className="relative flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center text-indigo-700 font-display font-semibold text-base shadow-sm flex-shrink-0">
                                {initials}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 text-white text-[12px] font-medium backdrop-blur-sm">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {dateLabel}
                                </span>
                                <div className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/20 backdrop-blur-sm transition-colors cursor-text">
                                    <Search className="w-4 h-4 text-white/80 flex-shrink-0" />
                                    <span className="text-[13px] text-white/80 truncate">Search products, SKUs, vendors or categories</span>
                                </div>
                                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 text-white text-[12px] font-medium backdrop-blur-sm">
                                    <Clock className="w-3.5 h-3.5" />
                                    {timeLabel}
                                </span>
                                <button className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0">
                                    <PencilLine className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Greeting */}
                        <div className="relative mt-8 lg:mt-10 max-w-2xl">
                            <h1 className="font-display text-[34px] lg:text-[42px] font-semibold text-white tracking-tightest leading-[1.05]">
                                Welcome back, {userName}. Today's a stocking day.
                            </h1>
                            <p className="text-white/75 mt-2.5 text-[14px]">
                                Your inventory hive is waiting to be organized.
                            </p>
                        </div>

                        {/* Quick remind row + actions */}
                        <div className="relative mt-7 lg:mt-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                            <div className="flex items-center gap-2 text-white/75 text-[12.5px]">
                                <Bell className="w-3.5 h-3.5" />
                                <span>Quick remind:</span>
                                <span className="text-white font-medium">{needsReview.length || 0} items</span>
                                <span>need AI review before close.</span>
                            </div>

                            <div className="flex flex-wrap items-end gap-x-4 gap-y-3 lg:gap-x-5">
                                <QuickAction icon={<PackagePlus className="w-5 h-5" />} label="Add Product" onClick={openNew} />
                                <QuickAction icon={<RefreshCw className="w-5 h-5" />} label="Restock" onClick={() => lowStock[0] && openStockDialog(lowStock[0])} />
                                <QuickAction icon={<Tag className="w-5 h-5" />} label="Set Pricing" onClick={() => allProducts[0] && openEdit(allProducts[0])} />
                                <QuickAction icon={<Truck className="w-5 h-5" />} label="Add Vendor" onClick={() => navigate('/vendors')} />
                                <QuickAction icon={<ShoppingCart className="w-5 h-5" />} label="Reorder" onClick={() => navigate('/reorder')} />
                                <QuickAction icon={<Upload className="w-5 h-5" />} label="Bulk Import" onClick={() => navigate('/sales')} />
                                <QuickAction icon={<Printer className="w-5 h-5" />} label="Export CSV" onClick={handleExport} />
                            </div>
                        </div>
                    </div>

                    {/* KPI STRIP */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <KpiCard
                            label="Total SKUs"
                            value={String(allProducts.length)}
                            delta="+3 / new"
                            deltaTone="green"
                            icon={<Boxes className="w-4 h-4" />}
                            iconBg="bg-indigo-50"
                            iconColor="text-indigo-700"
                        />
                        <KpiCard
                            label="Low stock"
                            value={String(lowStock.length)}
                            delta={`+${Math.min(lowStock.length, 7)} / 24h`}
                            deltaTone={lowStock.length > 0 ? 'red' : 'gray'}
                            icon={<TrendingDown className="w-4 h-4" />}
                            iconBg="bg-rose-50"
                            iconColor="text-rose-700"
                        />
                        <KpiCard
                            label="Needs review"
                            value={String(needsReview.length)}
                            delta="AI-flagged"
                            deltaTone="gray"
                            icon={<AlertCircle className="w-4 h-4" />}
                            iconBg="bg-amber-50"
                            iconColor="text-amber-700"
                        />
                        <KpiCard
                            label="Out of stock"
                            value={String(outOfStock)}
                            delta={outOfStock > 0 ? `+${outOfStock} today` : 'None'}
                            deltaTone={outOfStock > 0 ? 'red' : 'green'}
                            icon={<AlertTriangle className="w-4 h-4" />}
                            iconBg="bg-rose-50"
                            iconColor="text-rose-700"
                        />
                        <KpiCard
                            label="Revenue at risk"
                            value={`$${(totalRevenueAtRisk || 0).toLocaleString()}`}
                            delta={totalRevenueAtRisk > 0 ? '−7d' : 'Stable'}
                            deltaTone={totalRevenueAtRisk > 0 ? 'red' : 'green'}
                            icon={<DollarSign className="w-4 h-4" />}
                            iconBg="bg-violet-50"
                            iconColor="text-violet-700"
                        />
                    </div>

                    {/* RECENT ACTIVITY */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-display text-base font-semibold text-ink-900 tracking-tight">Recent Activity</h2>
                            <div className="flex items-center gap-2">
                                {isDemoAccount && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm('DELETE ALL products, sales, and invoices? This cannot be undone.')) return;
                                            const token = localStorage.getItem('token');
                                            const res = await fetch(`${API_URL}/products/delete-all`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                                            const data = await res.json();
                                            alert(data.message);
                                            fetchProducts();
                                        }}
                                        className="text-[12px] font-medium text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                    >
                                        Reset demo data
                                    </button>
                                )}
                                <button onClick={handleExport} className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 hover:text-ink-900 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors">
                                    <Download className="w-3.5 h-3.5" /> Export
                                </button>
                                <button onClick={openNew} className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-ink-900 hover:bg-ink-800 px-3 py-1.5 rounded-lg transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Add Product
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Products */}
                            <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-ink-500" />
                                        <span className="text-[13px] font-semibold text-ink-900 tracking-tight">Products</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-ink-400" />
                                </div>
                                <div className="px-1.5 py-1.5">
                                    {recentlyChanged.length === 0 ? (
                                        <div className="px-3 py-8 text-center text-[12px] text-ink-500">No products yet — add your first one.</div>
                                    ) : recentlyChanged.map(p => {
                                        const stock = p.inventorySnapshots?.[0]?.quantityOnHand ?? p.initialStock ?? 0;
                                        const isLow = lowStock.some(lp => lp.id === p.id);
                                        const isReview = needsReview.some(np => np.id === p.id);
                                        return (
                                            <ActivityRow
                                                key={p.id}
                                                icon={<Package className="w-4 h-4 text-indigo-700" />}
                                                iconBg="bg-indigo-50"
                                                title={p.name}
                                                subtitle={`${p.category || 'Uncategorized'} · ${stock} on hand`}
                                                badge={isReview ? { label: 'Needs review', tone: 'amber' } : isLow ? { label: 'Low stock', tone: 'red' } : { label: 'Healthy', tone: 'green' }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Vendors */}
                            <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-ink-500" />
                                        <span className="text-[13px] font-semibold text-ink-900 tracking-tight">Vendors</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-ink-400" />
                                </div>
                                <div className="px-1.5 py-1.5">
                                    {topVendors.length === 0 ? (
                                        <div className="px-3 py-8 text-center text-[12px] text-ink-500">No vendor data yet.</div>
                                    ) : topVendors.map(([vendor, count]) => (
                                        <ActivityRow
                                            key={vendor}
                                            icon={<span className="text-indigo-700">{vendor.slice(0, 2).toUpperCase()}</span>}
                                            iconBg="bg-indigo-50"
                                            title={vendor}
                                            subtitle={`${count} SKU${count !== 1 ? 's' : ''} · vendor partner`}
                                            badge={{ label: `${count} SKUs`, tone: 'indigo' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-ink-500" />
                                        <span className="text-[13px] font-semibold text-ink-900 tracking-tight">Categories</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-ink-400" />
                                </div>
                                <div className="px-1.5 py-1.5">
                                    {topCategories.length === 0 ? (
                                        <div className="px-3 py-8 text-center text-[12px] text-ink-500">No categories yet.</div>
                                    ) : topCategories.map(([cat, count]) => (
                                        <ActivityRow
                                            key={cat}
                                            icon={<Layers className="w-4 h-4 text-violet-700" />}
                                            iconBg="bg-violet-50"
                                            title={cat}
                                            subtitle={`${count} product${count !== 1 ? 's' : ''} in catalog`}
                                            badge={{ label: `${count}`, tone: 'gray' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MY TASKS */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-display text-base font-semibold text-ink-900 tracking-tight">My Tasks</h2>
                            <div className="flex items-center gap-1.5">
                                <button className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 hover:text-ink-900 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors">
                                    <Maximize2 className="w-3.5 h-3.5" /> Expand
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-ink-500 hover:text-ink-900 transition-colors">
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-ink-500 hover:text-ink-900 transition-colors">
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Restock Tasks */}
                            <div className="bg-white border border-ink-200 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                                        <span className="text-[12px] font-semibold text-ink-900 tracking-tight">Restock Tasks</span>
                                        <span className="text-[11px] text-ink-500 tabular-nums">{lowStock.length}</span>
                                    </div>
                                    <button onClick={() => lowStock[0] && openStockDialog(lowStock[0])} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-ink-100 text-ink-500">
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {lowStock.slice(0, 2).map(p => (
                                    <div key={p.id} className="bg-ink-50 rounded-xl p-3 mb-2 last:mb-0">
                                        <div className="text-[12.5px] font-semibold text-ink-900 tracking-tight">{p.name}</div>
                                        <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-2">
                                            {(p.inventorySnapshots?.[0]?.quantityOnHand ?? p.initialStock ?? 0)} units left · reorder before close
                                        </div>
                                    </div>
                                ))}
                                {lowStock.length === 0 && (
                                    <div className="text-[11.5px] text-ink-500 italic px-1 py-2">All stock healthy.</div>
                                )}
                            </div>

                            {/* Pricing Tasks */}
                            <div className="bg-white border border-ink-200 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[12px] font-semibold text-ink-900 tracking-tight">Pricing Tasks</span>
                                        <span className="text-[11px] text-ink-500 tabular-nums">2</span>
                                    </div>
                                    <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-ink-100 text-ink-500">
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="bg-ink-50 rounded-xl p-3 mb-2">
                                    <div className="text-[12.5px] font-semibold text-ink-900 tracking-tight">Review margins on slow movers</div>
                                    <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-2">
                                        Auto-flagged 5 SKUs trending below 15% margin this week.
                                    </div>
                                </div>
                                <div className="bg-ink-50 rounded-xl p-3">
                                    <div className="text-[12.5px] font-semibold text-ink-900 tracking-tight">Update vendor cost prices</div>
                                    <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-2">
                                        Sync latest invoice OCR results before reordering.
                                    </div>
                                </div>
                            </div>

                            {/* Review Tasks */}
                            <div className="bg-white border border-ink-200 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-[12px] font-semibold text-ink-900 tracking-tight">Review Tasks</span>
                                        <span className="text-[11px] text-ink-500 tabular-nums">{needsReview.length}</span>
                                    </div>
                                    <button onClick={() => setIsBulkReviewOpen(true)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-ink-100 text-ink-500">
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {needsReview.slice(0, 2).map(p => (
                                    <div key={p.id} className="bg-ink-50 rounded-xl p-3 mb-2 last:mb-0">
                                        <div className="text-[12.5px] font-semibold text-ink-900 tracking-tight line-clamp-1">{p.name}</div>
                                        <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-2">
                                            AI suggests changes — confirm name, category, and stock level.
                                        </div>
                                    </div>
                                ))}
                                {needsReview.length === 0 && (
                                    <div className="text-[11.5px] text-ink-500 italic px-1 py-2">Nothing pending review.</div>
                                )}
                                {needsReview.length > 0 && (
                                    <button
                                        onClick={() => setIsBulkReviewOpen(true)}
                                        className="mt-2 w-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Review with AI
                                    </button>
                                )}
                            </div>

                            {/* General Tasks */}
                            <div className="bg-white border border-ink-200 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                                        <span className="text-[12px] font-semibold text-ink-900 tracking-tight">General Tasks</span>
                                        <span className="text-[11px] text-ink-500 tabular-nums">2</span>
                                    </div>
                                    <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-ink-100 text-ink-500">
                                        <PlusIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="bg-ink-50 rounded-xl p-3 mb-2">
                                    <div className="text-[12.5px] font-semibold text-ink-900 tracking-tight">Run weekly stock count</div>
                                    <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-2">
                                        Schedule a physical count for this Sunday morning.
                                    </div>
                                </div>
                                <div className="bg-ink-50 rounded-xl p-3">
                                    <div className="text-[12.5px] font-semibold text-ink-900 tracking-tight">Print shelf labels</div>
                                    <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-2">
                                        Pull updated price tags for any SKUs changed this week.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NEEDS REVIEW DETAILED CARDS (collapsed by default) */}
                    {needsReview.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-display text-base font-semibold text-ink-900 tracking-tight flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    Needs Your Review
                                    <span className="text-[12px] font-medium text-ink-500 tabular-nums">({needsReview.length})</span>
                                </h2>
                                <button
                                    onClick={() => setIsBulkReviewOpen(true)}
                                    className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-700 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Bulk AI Review
                                </button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                {needsReview.slice(0, 4).map(product => (
                                    <ProductReviewCard
                                        key={product.id}
                                        product={product}
                                        onConfirmAll={() => handleConfirmProduct(product)}
                                        onEdit={() => openEdit(product)}
                                        onIgnore={() => { }}
                                    />
                                ))}
                            </div>
                            {needsReview.length > 4 && (
                                <p className="text-center text-ink-500 text-[12px] mt-3">
                                    +{needsReview.length - 4} more items needing review
                                </p>
                            )}
                        </div>
                    )}

                    {/* ALL PRODUCTS — collapsible table for power users */}
                    <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                        <button
                            onClick={() => setShowAllProducts(!showAllProducts)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-ink-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {showAllProducts ? <ChevronUp className="w-4 h-4 text-ink-500" /> : <ChevronDown className="w-4 h-4 text-ink-500" />}
                                <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">All Products</span>
                                <span className="text-[12px] text-ink-500 tabular-nums">({allProducts.length})</span>
                            </div>
                            <span className="text-[11.5px] text-ink-500">{showAllProducts ? 'Hide table' : 'Show table'}</span>
                        </button>

                        {showAllProducts && (
                            <div className="border-t border-ink-100 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 border border-ink-200 max-w-sm flex-1">
                                        <Search className="w-3.5 h-3.5 text-ink-400" />
                                        <input
                                            placeholder="Search products..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="bg-transparent border-0 outline-none text-[13px] flex-1"
                                        />
                                    </div>
                                </div>
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Category</TableHead>
                                                    <TableHead>Stock</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredProducts.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center h-24 text-ink-500">
                                                            No products found.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredProducts.map(product => {
                                                        const currentStock = product.inventorySnapshots?.[0]?.quantityOnHand ?? product.initialStock ?? null;
                                                        return (
                                                            <TableRow key={product.id}>
                                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                                <TableCell>{product.category || <span className="text-ink-400">—</span>}</TableCell>
                                                                <TableCell>
                                                                    {currentStock !== null ? (
                                                                        <span className={`tabular-nums ${currentStock < 10 ? 'text-rose-600 font-medium' : ''}`}>{currentStock}</span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => openStockDialog(product)}
                                                                            className="text-ink-400 hover:text-indigo-600 underline underline-offset-2"
                                                                        >
                                                                            Set count
                                                                        </button>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="tabular-nums">
                                                                    {product.sellingPrice ? `$${product.sellingPrice.toFixed(2)}` : <span className="text-ink-400">—</span>}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleDelete(product.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* DIALOGS */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{currentProduct.id ? 'Edit Product' : 'New Product'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={currentProduct.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentProduct({ ...currentProduct, name: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Barcode</Label>
                                        <Input value={currentProduct.barcode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentProduct({ ...currentProduct, barcode: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Input value={currentProduct.category} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentProduct({ ...currentProduct, category: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Vendor / Supplier</Label>
                                    <Input placeholder="e.g. Coca-Cola Co." value={currentProduct.vendor || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentProduct({ ...currentProduct, vendor: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Cost Price</Label>
                                        <Input type="number" step="0.01" value={currentProduct.costPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentProduct({ ...currentProduct, costPrice: parseFloat(e.target.value) })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Selling Price</Label>
                                        <Input type="number" step="0.01" value={currentProduct.sellingPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentProduct({ ...currentProduct, sellingPrice: parseFloat(e.target.value) })} required />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full">Save Product</Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Set Starting Inventory</DialogTitle>
                                <DialogDescription>
                                    How many units of {stockProduct?.name} do you currently have?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {stockProduct?.aiSuggestions?.suggestedMinStock && (
                                    <div className="p-3 bg-indigo-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-indigo-700 text-sm">
                                            <Sparkles size={14} />
                                            <span>AI suggests: {stockProduct.aiSuggestions.suggestedMinStock.value} units</span>
                                            <span className="text-indigo-500">({stockProduct.aiSuggestions.suggestedMinStock.confidence}%)</span>
                                        </div>
                                        <p className="text-xs text-indigo-600 mt-1">{stockProduct.aiSuggestions.suggestedMinStock.reason}</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Current Stock Quantity</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={stockValue}
                                        onChange={(e) => setStockValue(e.target.value)}
                                        placeholder="e.g., 50"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setIsStockDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1" onClick={handleSetInitialStock}>
                                        Set Starting Stock
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <BulkReviewModal
                        isOpen={isBulkReviewOpen}
                        onClose={() => setIsBulkReviewOpen(false)}
                        products={needsReview}
                        onConfirmHighConfidence={handleBulkConfirmHighConfidence}
                        onConfirmAll={handleBulkConfirmHighConfidence}
                        onReviewIndividually={() => setIsBulkReviewOpen(false)}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
