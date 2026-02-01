import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, Minus, DollarSign, Clock, AlertTriangle, ChevronDown, ChevronUp, Search } from 'lucide-react';
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

    const getRatingBadge = (rating: VendorScorecard['rating']) => {
        switch (rating) {
            case 'green':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Top Performer
                    </span>
                );
            case 'yellow':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        Average
                    </span>
                );
            case 'red':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                        Needs Review
                    </span>
                );
        }
    };

    const getTrendIcon = (trend: VendorScorecard['trend']) => {
        switch (trend) {
            case 'up':
                return <TrendingUp size={14} className="text-emerald-400" />;
            case 'down':
                return <TrendingDown size={14} className="text-rose-400" />;
            default:
                return <Minus size={14} className="text-slate-400" />;
        }
    };

    const filteredVendors = vendors.filter(vendor => {
        const matchesSearch = vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRating = filterRating === 'all' || vendor.rating === filterRating;
        return matchesSearch && matchesRating;
    });

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Vendor Intelligence</h1>
                        <p className="text-slate-400 mt-1">
                            Compare vendor performance and identify opportunities
                        </p>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search vendors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 w-48"
                            />
                        </div>

                        <select
                            value={filterRating}
                            onChange={(e) => setFilterRating(e.target.value as any)}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                        >
                            <option value="all">All Ratings</option>
                            <option value="green">Top Performers</option>
                            <option value="yellow">Average</option>
                            <option value="red">Needs Review</option>
                        </select>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-slate-900 rounded-xl p-5 border border-slate-700 animate-pulse">
                                <div className="h-6 bg-slate-700 rounded w-1/2 mb-4"></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="h-16 bg-slate-700 rounded"></div>
                                    <div className="h-16 bg-slate-700 rounded"></div>
                                    <div className="h-16 bg-slate-700 rounded"></div>
                                    <div className="h-16 bg-slate-700 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-center">
                        <AlertTriangle size={24} className="text-rose-400 mx-auto mb-2" />
                        <p className="text-rose-400">{error}</p>
                        <button
                            onClick={fetchVendors}
                            className="mt-3 text-sm text-violet-400 hover:text-violet-300"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && vendors.length === 0 && (
                    <div className="bg-slate-900 rounded-xl p-12 text-center border border-slate-700">
                        <Package size={48} className="text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No vendors found</h3>
                        <p className="text-slate-400 max-w-md mx-auto">
                            Add vendor names to your products to see vendor performance analytics here.
                        </p>
                    </div>
                )}

                {/* Vendor Cards */}
                {!loading && !error && filteredVendors.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredVendors.map((vendor) => (
                            <div
                                key={vendor.vendorName}
                                className={`bg-slate-900 rounded-xl border transition-all ${expandedVendor === vendor.vendorName
                                    ? 'border-violet-500/50 ring-1 ring-violet-500/20'
                                    : 'border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                                                <Package size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">{vendor.vendorName}</h3>
                                                <p className="text-xs text-slate-400">
                                                    {vendor.productCount} products
                                                </p>
                                            </div>
                                        </div>
                                        {getRatingBadge(vendor.rating)}
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                                <DollarSign size={12} />
                                                Revenue
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-white">
                                                    ${vendor.revenue.toLocaleString()}
                                                </span>
                                                {getTrendIcon(vendor.trend)}
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <div className="text-xs text-slate-400 mb-1">Margin</div>
                                            <div className={`text-lg font-bold ${vendor.marginPercent >= 20 ? 'text-emerald-400' :
                                                vendor.marginPercent >= 10 ? 'text-amber-400' : 'text-rose-400'
                                                }`}>
                                                {vendor.marginPercent.toFixed(1)}%
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                                <Clock size={12} />
                                                Inventory Days
                                            </div>
                                            <div className={`text-lg font-bold ${vendor.inventoryDays <= 30 ? 'text-emerald-400' :
                                                vendor.inventoryDays <= 60 ? 'text-amber-400' : 'text-rose-400'
                                                }`}>
                                                {vendor.inventoryDays > 365 ? '365+' : vendor.inventoryDays}
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                                <AlertTriangle size={12} />
                                                Waste Contrib.
                                            </div>
                                            <div className={`text-lg font-bold ${vendor.wasteContribution <= 10 ? 'text-emerald-400' :
                                                vendor.wasteContribution <= 25 ? 'text-amber-400' : 'text-rose-400'
                                                }`}>
                                                {vendor.wasteContribution.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score Bar */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Overall Score</span>
                                            <span className="font-medium text-white">{vendor.overallScore}/100</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${vendor.rating === 'green' ? 'bg-emerald-500' :
                                                    vendor.rating === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                                                    }`}
                                                style={{ width: `${vendor.overallScore}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Expand Button */}
                                    <button
                                        onClick={() => handleExpandVendor(vendor.vendorName)}
                                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        {expandedVendor === vendor.vendorName ? (
                                            <>
                                                <ChevronUp size={16} />
                                                Hide Products
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown size={16} />
                                                View Products
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Expanded Products */}
                                {expandedVendor === vendor.vendorName && (
                                    <div className="border-t border-slate-700 p-4 bg-slate-800/30">
                                        {loadingProducts ? (
                                            <div className="text-center py-4 text-slate-400">
                                                Loading products...
                                            </div>
                                        ) : vendorProducts.length === 0 ? (
                                            <div className="text-center py-4 text-slate-400">
                                                No products found
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {vendorProducts.map((product: any) => (
                                                    <div
                                                        key={product.id}
                                                        className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded-lg"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-medium text-white truncate">
                                                                {product.name}
                                                            </div>
                                                            <div className="text-xs text-slate-400">
                                                                Stock: {product.currentStock} | Sold: {product.totalSold}
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <div className="text-sm font-medium text-white">
                                                                ${product.revenue.toLocaleString()}
                                                            </div>
                                                            <div className={`text-xs ${product.margin >= 20 ? 'text-emerald-400' :
                                                                product.margin >= 10 ? 'text-amber-400' : 'text-rose-400'
                                                                }`}>
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
            </div>
        </DashboardLayout>
    );
}
