import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    Package,
    Sparkles,
    AlertCircle,
    Download,
    X,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import type { Product } from '@/types';

type StatusKey = 'all' | 'healthy' | 'low' | 'out' | 'review';

const STATUS_FILTERS: { key: StatusKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'healthy', label: 'Healthy' },
    { key: 'low', label: 'Low stock' },
    { key: 'out', label: 'Out of stock' },
    { key: 'review', label: 'Needs review' },
];

interface StatusBadgeProps {
    tone: 'green' | 'amber' | 'red' | 'gray';
    children: React.ReactNode;
}
const StatusBadge: React.FC<StatusBadgeProps> = ({ tone, children }) => {
    const cls = {
        green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        red: 'bg-rose-50 text-rose-700 border-rose-200',
        gray: 'bg-ink-100 text-ink-700 border-ink-200',
    }[tone];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-medium border rounded-full whitespace-nowrap ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'red' ? 'bg-rose-500' : 'bg-ink-400'}`} />
            {children}
        </span>
    );
};

interface MetricProps {
    label: string;
    value: string;
    sublabel?: string;
    tone?: 'default' | 'red' | 'amber';
}
const Metric: React.FC<MetricProps> = ({ label, value, sublabel, tone = 'default' }) => {
    const valueCls = tone === 'red' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-ink-900';
    return (
        <div className="bg-white border border-ink-200 rounded-2xl px-5 py-4 hover:border-ink-300 transition-colors">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500 font-semibold">{label}</p>
            <p className={`font-display text-[28px] font-semibold tracking-tightest tabular-nums leading-none mt-2 ${valueCls}`}>{value}</p>
            {sublabel && <p className="text-[11.5px] text-ink-500 mt-1.5 tabular-nums">{sublabel}</p>}
        </div>
    );
};

export default function Products() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [isBulkReviewOpen, setIsBulkReviewOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [stockProduct, setStockProduct] = useState<Product | null>(null);
    const [stockValue, setStockValue] = useState('');
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
    const isDemoAccount = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.email === 'demo@fluxor.cloud'; } catch { return false; } })();

    useEffect(() => {
        fetchProducts();
    }, []);

    // Sync search term with URL ?q=…
    useEffect(() => {
        const q = searchParams.get('q') || '';
        if (q !== searchTerm) setSearchTerm(q);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const updateSearch = (q: string) => {
        setSearchTerm(q);
        const params = new URLSearchParams(searchParams);
        if (q) params.set('q', q);
        else params.delete('q');
        setSearchParams(params, { replace: true });
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/products?limit=500', token || '');
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

    // Categorization
    const { needsReview, lowStock, totalRevenueAtRisk } = categorizeProducts(products);
    const allProducts = useMemo(() => products.filter(p => !p.isUnmatched), [products]);
    const outOfStock = useMemo(() => allProducts.filter(p => {
        const qty = p.inventorySnapshots?.[0]?.quantityOnHand ?? p.initialStock ?? 0;
        return qty === 0;
    }), [allProducts]);

    const productStock = (p: Product) => p.inventorySnapshots?.[0]?.quantityOnHand ?? p.initialStock ?? null;

    const filteredProducts = useMemo(() => {
        let list = allProducts;
        // Status filter
        if (statusFilter === 'low') {
            const lowIds = new Set(lowStock.map(p => p.id));
            list = list.filter(p => lowIds.has(p.id));
        } else if (statusFilter === 'out') {
            const outIds = new Set(outOfStock.map(p => p.id));
            list = list.filter(p => outIds.has(p.id));
        } else if (statusFilter === 'review') {
            list = needsReview;
        } else if (statusFilter === 'healthy') {
            const lowIds = new Set(lowStock.map(p => p.id));
            const outIds = new Set(outOfStock.map(p => p.id));
            const reviewIds = new Set(needsReview.map(p => p.id));
            list = list.filter(p => !lowIds.has(p.id) && !outIds.has(p.id) && !reviewIds.has(p.id));
        }
        // Search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q) ||
                p.vendor?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [allProducts, lowStock, outOfStock, needsReview, statusFilter, searchTerm]);

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

    const productStatus = (p: Product): { tone: 'green' | 'amber' | 'red' | 'gray'; label: string } => {
        const stock = productStock(p);
        const isReview = needsReview.some(r => r.id === p.id);
        if (isReview) return { tone: 'amber', label: 'Needs review' };
        if (stock === null) return { tone: 'gray', label: 'No count' };
        if (stock === 0) return { tone: 'red', label: 'Out of stock' };
        if (lowStock.some(l => l.id === p.id)) return { tone: 'red', label: 'Low stock' };
        return { tone: 'green', label: 'Healthy' };
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-ink-100/60 font-sans">
                <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">

                    {/* Page header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-indigo-600">Catalog</p>
                            <h1 className="font-display text-3xl font-semibold text-ink-900 tracking-tightest mt-1.5 leading-tight">
                                Inventory
                            </h1>
                            <p className="text-[13.5px] text-ink-600 mt-1.5 max-w-xl">
                                A single source of truth for every SKU. Filter by status, scan for stockouts, or hand low-confidence items to AI for review.
                            </p>
                        </div>
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
                                    className="text-[12px] font-medium text-rose-600 hover:text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                                >
                                    Reset demo data
                                </button>
                            )}
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-700 hover:text-ink-900 bg-white border border-ink-200 hover:border-ink-300 px-3 py-2 rounded-lg transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> Export CSV
                            </button>
                            <button
                                onClick={openNew}
                                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-900 hover:bg-ink-800 px-3.5 py-2 rounded-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Product
                            </button>
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Metric label="Total SKUs" value={String(allProducts.length)} sublabel={`${needsReview.length} pending review`} />
                        <Metric label="Low stock" value={String(lowStock.length)} tone={lowStock.length > 0 ? 'red' : 'default'} sublabel={lowStock.length > 0 ? 'Reorder before close' : 'All healthy'} />
                        <Metric label="Out of stock" value={String(outOfStock.length)} tone={outOfStock.length > 0 ? 'red' : 'default'} sublabel={outOfStock.length > 0 ? 'Lost shelf coverage' : 'Fully covered'} />
                        <Metric label="Revenue at risk" value={`$${(totalRevenueAtRisk || 0).toLocaleString()}`} tone={totalRevenueAtRisk > 0 ? 'amber' : 'default'} sublabel="Next 7 days" />
                    </div>

                    {/* Needs review banner — only when present */}
                    {needsReview.length > 0 && (
                        <div className="bg-white border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[13.5px] font-semibold text-ink-900 tracking-tight">{needsReview.length} item{needsReview.length === 1 ? '' : 's'} need your review</p>
                                    <p className="text-[12px] text-ink-600">AI flagged name, category, or stock changes worth confirming.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBulkReviewOpen(true)}
                                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg transition-colors flex-shrink-0"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Review with AI
                            </button>
                        </div>
                    )}

                    {/* Toolbar: search + status filter chips */}
                    <div className="bg-white border border-ink-200 rounded-2xl px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 border border-ink-200 flex-1 min-w-0">
                            <Search className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => updateSearch(e.target.value)}
                                placeholder="Search by name, SKU, vendor or category"
                                className="bg-transparent border-0 outline-none text-[13px] flex-1 min-w-0 text-ink-900 placeholder:text-ink-500"
                            />
                            {searchTerm && (
                                <button onClick={() => updateSearch('')} className="text-ink-400 hover:text-ink-700 flex-shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {STATUS_FILTERS.map(f => {
                                const count =
                                    f.key === 'all' ? allProducts.length :
                                    f.key === 'low' ? lowStock.length :
                                    f.key === 'out' ? outOfStock.length :
                                    f.key === 'review' ? needsReview.length :
                                    allProducts.length - lowStock.length - outOfStock.length - needsReview.length;
                                const active = statusFilter === f.key;
                                return (
                                    <button
                                        key={f.key}
                                        onClick={() => setStatusFilter(f.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium tracking-tight transition-colors whitespace-nowrap ${
                                            active
                                                ? 'bg-ink-900 text-white'
                                                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                                        }`}
                                    >
                                        {f.label}
                                        <span className={`tabular-nums text-[11px] ${active ? 'text-white/75' : 'text-ink-400'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main table — clean & dense */}
                    <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-ink-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-ink-500" />
                                <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">
                                    {statusFilter === 'all' ? 'All products' : STATUS_FILTERS.find(f => f.key === statusFilter)?.label}
                                </span>
                                <span className="text-[12px] text-ink-500 tabular-nums">({filteredProducts.length})</span>
                            </div>
                            {searchTerm && (
                                <span className="text-[11.5px] text-ink-500">Filtering by <span className="text-ink-700 font-medium">"{searchTerm}"</span></span>
                            )}
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3">
                                    <Package className="w-4 h-4 text-ink-400" />
                                </div>
                                <p className="text-[13px] text-ink-700 font-medium">No products match this view</p>
                                <p className="text-[12px] text-ink-500 mt-1">Try clearing filters or adding a new product.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.12em] text-ink-500 bg-ink-50/50 border-b border-ink-100">
                                            <th className="px-5 py-2.5 text-left">Product</th>
                                            <th className="px-3 py-2.5 text-left">Status</th>
                                            <th className="px-3 py-2.5 text-left">Category</th>
                                            <th className="px-3 py-2.5 text-left">Vendor</th>
                                            <th className="px-3 py-2.5 text-right">Stock</th>
                                            <th className="px-3 py-2.5 text-right">Price</th>
                                            <th className="px-5 py-2.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ink-100">
                                        {filteredProducts.map(p => {
                                            const stock = productStock(p);
                                            const status = productStatus(p);
                                            return (
                                                <tr key={p.id} className="hover:bg-ink-50/60 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                                                                <Package className="w-4 h-4" />
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="text-[13px] font-semibold text-ink-900 tracking-tight truncate">{p.name}</div>
                                                                {p.sku && <div className="text-[11px] text-ink-500 font-mono truncate">{p.sku}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                                                    </td>
                                                    <td className="px-3 py-3 text-[12.5px] text-ink-700">
                                                        {p.category || <span className="text-ink-400">—</span>}
                                                    </td>
                                                    <td className="px-3 py-3 text-[12.5px] text-ink-700">
                                                        {p.vendor || <span className="text-ink-400">—</span>}
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums">
                                                        {stock !== null ? (
                                                            <span className={`text-[13px] font-medium ${stock === 0 ? 'text-rose-600' : stock < 10 ? 'text-amber-700' : 'text-ink-900'}`}>{stock}</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => openStockDialog(p)}
                                                                className="text-[12px] text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                                                            >
                                                                Set count
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums">
                                                        {p.sellingPrice ? (
                                                            <span className="text-[13px] font-medium text-ink-900">${p.sellingPrice.toFixed(2)}</span>
                                                        ) : (
                                                            <span className="text-ink-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="inline-flex items-center gap-0.5">
                                                            <button
                                                                onClick={() => openEdit(p)}
                                                                className="w-7 h-7 rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-100 flex items-center justify-center transition-colors"
                                                                aria-label="Edit"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(p.id)}
                                                                className="w-7 h-7 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                                                aria-label="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Review cards — only when needed */}
                    {needsReview.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-display text-[15px] font-semibold text-ink-900 tracking-tight flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    Pending review
                                    <span className="text-[12px] font-medium text-ink-500 tabular-nums">({needsReview.length})</span>
                                </h2>
                                <button
                                    onClick={() => setIsBulkReviewOpen(true)}
                                    className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-700 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Bulk AI review
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
