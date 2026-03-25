import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, Minus, DollarSign, Clock, AlertTriangle, ChevronDown, ChevronUp, Search, Plus, X } from 'lucide-react';
import type { VendorScorecard } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';

export default function Vendors() {
    const [vendors, setVendors] = useState<VendorScorecard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
    const [vendorProducts, setVendorProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRating, setFilterRating] = useState<'all' | 'green' | 'yellow' | 'red'>('all');

    // Add product modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', vendor: '', barcode: '', category: '', costPrice: '', sellingPrice: '' });
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || '';
            const data = await api.get('/vendors', token);
            setVendors(data);
        } catch (err) {
            setError('Failed to load vendors');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorProducts = async (vendorName: string) => {
        try {
            setLoadingProducts(true);
            const token = localStorage.getItem('token') || '';
            const data = await api.get(`/vendors/${encodeURIComponent(vendorName)}/products`, token);
            setVendorProducts(data);
        } catch (err) {
            console.error('Failed to load vendor products:', err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleExpandVendor = async (vendorName: string) => {
        if (expandedVendor === vendorName) {
            setExpandedVendor(null);
            setVendorProducts([]);
        } else {
            setExpandedVendor(vendorName);
            await fetchVendorProducts(vendorName);
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name || !addForm.vendor) { setAddError('Product name and vendor are required.'); return; }
        setAddLoading(true);
        setAddError('');
        try {
            const token = localStorage.getItem('token') || '';
            await api.post('/products', {
                name: addForm.name,
                vendor: addForm.vendor,
                barcode: addForm.barcode || undefined,
                category: addForm.category || undefined,
                costPrice: parseFloat(addForm.costPrice) || 0,
                sellingPrice: parseFloat(addForm.sellingPrice) || 0,
            }, token);
            setShowAddModal(false);
            setAddForm({ name: '', vendor: '', barcode: '', category: '', costPrice: '', sellingPrice: '' });
            await fetchVendors();
        } catch (err: any) {
            setAddError(err.message || 'Failed to add product');
        } finally {
            setAddLoading(false);
        }
    };

    const getRatingBadge = (rating: VendorScorecard['rating']) => {
        switch (rating) {
            case 'green':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Top Performer
                    </span>
                );
            case 'yellow':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                        Average
                    </span>
                );
            case 'red':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                        Needs Review
                    </span>
                );
        }
    };

    const getTrendIcon = (trend: VendorScorecard['trend']) => {
        switch (trend) {
            case 'up': return <TrendingUp size={14} className="text-emerald-600" />;
            case 'down': return <TrendingDown size={14} className="text-rose-600" />;
            default: return <Minus size={14} className="text-gray-400" />;
        }
    };

    const filteredVendors = vendors.filter(vendor => {
        const matchesSearch = vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRating = filterRating === 'all' || vendor.rating === filterRating;
        return matchesSearch && matchesRating;
    });

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Vendor Intelligence</h1>
                        <p className="text-gray-500 mt-1">Compare vendor performance and identify opportunities</p>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search vendors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 w-48"
                            />
                        </div>
                        <select
                            value={filterRating}
                            onChange={(e) => setFilterRating(e.target.value as any)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">All Ratings</option>
                            <option value="green">Top Performers</option>
                            <option value="yellow">Average</option>
                            <option value="red">Needs Review</option>
                        </select>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                            Add Product
                        </button>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 animate-pulse">
                                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[...Array(4)].map((_, j) => <div key={j} className="h-16 bg-gray-100 rounded"></div>)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                        <AlertTriangle size={24} className="text-rose-500 mx-auto mb-2" />
                        <p className="text-rose-600">{error}</p>
                        <button onClick={fetchVendors} className="mt-3 text-sm text-blue-600 hover:underline">Try again</button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && vendors.length === 0 && (
                    <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                        <Package size={48} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors yet</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Add products with a vendor name to see performance analytics here.
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                            Add First Product
                        </button>
                    </div>
                )}

                {/* Vendor Cards */}
                {!loading && !error && filteredVendors.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredVendors.map((vendor) => (
                            <div
                                key={vendor.vendorName}
                                className={`bg-white rounded-xl border transition-all ${expandedVendor === vendor.vendorName
                                    ? 'border-blue-400 ring-1 ring-blue-400/20'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                                <Package size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{vendor.vendorName}</h3>
                                                <p className="text-xs text-gray-500">{vendor.productCount} product{vendor.productCount !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                        {getRatingBadge(vendor.rating)}
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                <DollarSign size={12} />
                                                Revenue (30d)
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-gray-900">${vendor.revenue.toLocaleString()}</span>
                                                {getTrendIcon(vendor.trend)}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Margin</div>
                                            <div className={`text-lg font-bold ${vendor.marginPercent >= 20 ? 'text-emerald-600' : vendor.marginPercent >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {vendor.marginPercent.toFixed(1)}%
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                <Clock size={12} />
                                                Inventory Days
                                            </div>
                                            <div className={`text-lg font-bold ${vendor.inventoryDays <= 30 ? 'text-emerald-600' : vendor.inventoryDays <= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {vendor.inventoryDays > 365 ? '365+' : vendor.inventoryDays}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                <AlertTriangle size={12} />
                                                Waste Contrib.
                                            </div>
                                            <div className={`text-lg font-bold ${vendor.wasteContribution <= 10 ? 'text-emerald-600' : vendor.wasteContribution <= 25 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {vendor.wasteContribution.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score Bar */}
                                    <div className="space-y-1.5 mb-4">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500">Overall Score</span>
                                            <span className="font-semibold text-gray-900">{vendor.overallScore}/100</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${vendor.rating === 'green' ? 'bg-emerald-500' : vendor.rating === 'yellow' ? 'bg-amber-400' : 'bg-rose-500'}`}
                                                style={{ width: `${vendor.overallScore}%` }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleExpandVendor(vendor.vendorName)}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        {expandedVendor === vendor.vendorName ? <><ChevronUp size={16} />Hide Products</> : <><ChevronDown size={16} />View Products</>}
                                    </button>
                                </div>

                                {/* Expanded Products */}
                                {expandedVendor === vendor.vendorName && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50/50 rounded-b-xl">
                                        {loadingProducts ? (
                                            <p className="text-center py-4 text-gray-400 text-sm">Loading products...</p>
                                        ) : vendorProducts.length === 0 ? (
                                            <p className="text-center py-4 text-gray-400 text-sm">No products found</p>
                                        ) : (
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {vendorProducts.map((product: any) => (
                                                    <div key={product.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                                                            <div className="text-xs text-gray-500">Stock: {product.currentStock} · Sold: {product.totalSold}</div>
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <div className="text-sm font-semibold text-gray-900">${product.revenue.toLocaleString()}</div>
                                                            <div className={`text-xs ${product.margin >= 20 ? 'text-emerald-600' : product.margin >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                {product.margin}% margin
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Product Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Add Product to Vendor</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">Assign a product to a supplier to track performance</p>
                                </div>
                                <button onClick={() => { setShowAddModal(false); setAddError(''); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                    <X size={20} />
                                </button>
                            </div>

                            {addError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{addError}</div>}

                            <form onSubmit={handleAddProduct} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Supplier *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Coca-Cola Co."
                                        value={addForm.vendor}
                                        onChange={e => setAddForm({ ...addForm, vendor: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Coca-Cola 330ml"
                                        value={addForm.name}
                                        onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                                        <input type="text" placeholder="optional" value={addForm.barcode} onChange={e => setAddForm({ ...addForm, barcode: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <input type="text" placeholder="optional" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price ($)</label>
                                        <input type="number" step="0.01" min="0" placeholder="0.00" value={addForm.costPrice} onChange={e => setAddForm({ ...addForm, costPrice: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price ($)</label>
                                        <input type="number" step="0.01" min="0" placeholder="0.00" value={addForm.sellingPrice} onChange={e => setAddForm({ ...addForm, sellingPrice: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => { setShowAddModal(false); setAddError(''); }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={addLoading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50">
                                        {addLoading ? 'Adding...' : 'Add Product'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
