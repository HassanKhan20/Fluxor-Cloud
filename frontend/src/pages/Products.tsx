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
    Plus, Search, Edit, Trash2, AlertTriangle, Package, Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
    Sparkles, Clock, DollarSign, TrendingDown, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Product } from '@/types';

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

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/products', token || '');
            // Enrich with AI suggestions
            const enriched = enrichProductsWithAI(data);
            setProducts(enriched);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (currentProduct.id) {
                await fetch(`${import.meta.env.VITE_API_URL}/products/${currentProduct.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(currentProduct)
                });
            } else {
                await api.post('/products', currentProduct, token || '');
            }
            setIsDialogOpen(false);
            fetchProducts();
        } catch (error) {
            alert('Failed to save product');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchProducts();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleSetInitialStock = async () => {
        if (!stockProduct || stockValue === '') return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/products/${stockProduct.id}/initial-stock`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ initialStock: parseInt(stockValue) })
            });
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
            // Build confirmed values from AI suggestions
            const confirmedData: Record<string, any> = {
                action: 'keep',
                name: suggestions?.suggestedName?.value || product.name,
                barcode: product.barcode
            };

            // Apply AI suggestions for category and price
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

            // Single API call to persist all confirmed values
            await fetch(`${import.meta.env.VITE_API_URL}/products/${product.id}/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(confirmedData)
            });

            // Set initial stock if suggested
            if (suggestions?.suggestedMinStock?.value && (product.initialStock === null || product.initialStock === undefined)) {
                await fetch(`${import.meta.env.VITE_API_URL}/products/${product.id}/initial-stock`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ initialStock: suggestions.suggestedMinStock.value })
                });
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
        setCurrentProduct({ name: '', barcode: '', sellingPrice: 0, costPrice: 0, category: '' });
        setIsDialogOpen(true);
    };

    const openStockDialog = (product: Product) => {
        setStockProduct(product);
        setStockValue(product.aiSuggestions?.suggestedMinStock?.value?.toString() || product.initialStock?.toString() || '');
        setIsStockDialogOpen(true);
    };

    // Categorize products
    const { needsReview, lowStock, healthy, totalRevenueAtRisk } = categorizeProducts(products);
    const allProducts = products.filter(p => !p.isUnmatched);
    const filteredProducts = allProducts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Loading your inventory...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:shadow-md transition-all"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                                <p className="text-gray-500 text-sm mt-1">
                                    Fluxor reviews your inventory daily so you don't have to.
                                </p>
                            </div>
                        </div>
                        <Button onClick={openNew}>
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </div>

                    {/* Action Summary Card */}
                    {(needsReview.length > 0 || lowStock.length > 0) && (
                        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] animate-fade-in-up">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">Today's Action Summary</h2>
                                    <p className="text-sm text-gray-500">Items that need your attention</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                {needsReview.length > 0 && (
                                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
                                        <AlertTriangle className="text-amber-600" size={24} />
                                        <div>
                                            <p className="font-semibold text-amber-900">{needsReview.length} items</p>
                                            <p className="text-sm text-amber-700">need review</p>
                                        </div>
                                    </div>
                                )}
                                {lowStock.length > 0 && (
                                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
                                        <TrendingDown className="text-red-600" size={24} />
                                        <div>
                                            <p className="font-semibold text-red-900">{lowStock.length} products</p>
                                            <p className="text-sm text-red-700">running low</p>
                                        </div>
                                    </div>
                                )}
                                {totalRevenueAtRisk > 0 && (
                                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                                        <DollarSign className="text-purple-600" size={24} />
                                        <div>
                                            <p className="font-semibold text-purple-900">${totalRevenueAtRisk}</p>
                                            <p className="text-sm text-purple-700">revenue at risk</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {needsReview.length > 0 && (
                                <Button onClick={() => setIsBulkReviewOpen(true)} className="w-full md:w-auto">
                                    <Sparkles size={16} className="mr-2" />
                                    Review All with AI
                                </Button>
                            )}
                        </div>
                    )}

                    {/* All Clear State */}
                    {needsReview.length === 0 && lowStock.length === 0 && products.length > 0 && (
                        <div className="bg-green-50 rounded-2xl p-6 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.04)] animate-fade-in-up">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <Check size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-green-900">All caught up!</h2>
                                    <p className="text-sm text-green-700">No items need your attention right now.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Low Stock Alerts */}
                    {lowStock.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <TrendingDown size={18} className="text-red-500" />
                                    Low Stock Alerts
                                </h2>
                            </div>
                            <div className="grid gap-3">
                                {lowStock.slice(0, 5).map(product => (
                                    <div
                                        key={product.id}
                                        className="bg-white rounded-xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                <Package size={18} className="text-red-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{product.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>{product.inventorySnapshots?.[0]?.quantityOnHand ?? product.initialStock ?? 0} left</span>
                                                    {product.aiSuggestions?.daysUntilStockout !== undefined && (
                                                        <>
                                                            <span>→</span>
                                                            <span className="text-red-600 font-medium">
                                                                {product.aiSuggestions.daysUntilStockout} days
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {product.aiSuggestions?.revenueAtRisk !== undefined && product.aiSuggestions.revenueAtRisk > 0 && (
                                                <span className="text-sm text-red-600 font-medium">
                                                    ${product.aiSuggestions.revenueAtRisk} at risk
                                                </span>
                                            )}
                                            <Button variant="outline" size="sm" onClick={() => openStockDialog(product)}>
                                                Restock
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Needs Review Section */}
                    {needsReview.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-500" />
                                    Needs Your Review ({needsReview.length})
                                </h2>
                                <Button variant="ghost" size="sm" onClick={() => setIsBulkReviewOpen(true)}>
                                    <Sparkles size={14} className="mr-1.5" />
                                    Bulk AI Review
                                </Button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                {needsReview.slice(0, 6).map(product => (
                                    <ProductReviewCard
                                        key={product.id}
                                        product={product}
                                        onConfirmAll={() => handleConfirmProduct(product)}
                                        onEdit={() => openEdit(product)}
                                        onIgnore={() => { }} // Could implement dismiss logic
                                    />
                                ))}
                            </div>
                            {needsReview.length > 6 && (
                                <p className="text-center text-gray-500 text-sm">
                                    +{needsReview.length - 6} more items needing review
                                </p>
                            )}
                        </div>
                    )}

                    {/* All Products (De-prioritized) */}
                    <div className="space-y-4">
                        <button
                            onClick={() => setShowAllProducts(!showAllProducts)}
                            className="flex items-center gap-2 text-gray-700 font-semibold hover:text-gray-900 transition-colors"
                        >
                            {showAllProducts ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            All Products ({allProducts.length})
                        </button>

                        {showAllProducts && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Search className="h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search products..."
                                        value={searchTerm}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                        className="max-w-sm"
                                    />
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
                                                        <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                                                            No products found.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredProducts.map((product) => {
                                                        const currentStock = product.inventorySnapshots?.[0]?.quantityOnHand ?? product.initialStock ?? null;
                                                        return (
                                                            <TableRow key={product.id}>
                                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                                <TableCell>{product.category || <span className="text-gray-400">—</span>}</TableCell>
                                                                <TableCell>
                                                                    {currentStock !== null ? (
                                                                        <span className={currentStock < 10 ? 'text-red-600 font-medium' : ''}>
                                                                            {currentStock}
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => openStockDialog(product)}
                                                                            className="text-gray-400 hover:text-blue-600 underline underline-offset-2"
                                                                        >
                                                                            Set count
                                                                        </button>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {product.sellingPrice ? `$${product.sellingPrice.toFixed(2)}` : <span className="text-gray-400">—</span>}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(product.id)}>
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
                            </>
                        )}
                    </div>

                    {/* Dialogs */}
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
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-blue-700 text-sm">
                                            <Sparkles size={14} />
                                            <span>AI suggests: {stockProduct.aiSuggestions.suggestedMinStock.value} units</span>
                                            <span className="text-blue-500">({stockProduct.aiSuggestions.suggestedMinStock.confidence}%)</span>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1">{stockProduct.aiSuggestions.suggestedMinStock.reason}</p>
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
