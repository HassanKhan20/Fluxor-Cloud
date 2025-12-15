import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, HelpCircle, Check, X, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Product } from '@/types';

export default function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [unmatchedProducts, setUnmatchedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [isUnmatchedDialogOpen, setIsUnmatchedDialogOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [stockProduct, setStockProduct] = useState<Product | null>(null);
    const [stockValue, setStockValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
        fetchUnmatchedProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/products', token || '');
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnmatchedProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/products/unmatched', token || '');
            setUnmatchedProducts(data);
        } catch (error) {
            console.error('Failed to fetch unmatched products', error);
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

    const handleMatchProduct = async (id: string, action: 'keep' | 'merge', targetProductId?: string) => {
        const token = localStorage.getItem('token');
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/products/${id}/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action, targetProductId })
            });
            fetchProducts();
            fetchUnmatchedProducts();
        } catch (error) {
            alert('Failed to match product');
        }
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
        setStockValue(product.initialStock?.toString() || '');
        setIsStockDialogOpen(true);
    };

    // Filter out unmatched products from main list
    const matchedProducts = products.filter(p => !p.isUnmatched);
    const filteredProducts = matchedProducts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Get stock display value
    const getStockDisplay = (product: Product) => {
        if (product.initialStock === null || product.initialStock === undefined) {
            return { value: 'Not set', isSet: false };
        }
        const currentStock = product.inventorySnapshots?.[0]?.quantityOnHand ?? product.initialStock;
        return { value: currentStock.toString(), isSet: true };
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
                    </DialogTrigger>
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
            </div>

            {/* Unmatched Products Alert */}
            {unmatchedProducts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-amber-900">Unmatched products ({unmatchedProducts.length} items)</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            These products were detected from your sales import but don't match any existing inventory.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => setIsUnmatchedDialogOpen(true)}>
                        Review & Match
                        <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Unmatched Products Dialog */}
            <Dialog open={isUnmatchedDialogOpen} onOpenChange={setIsUnmatchedDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Unmatched Products</DialogTitle>
                        <DialogDescription>
                            These products were auto-created from your sales import. Keep them as new products or merge with existing ones.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                        {unmatchedProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-gray-500">Barcode: {product.barcode || 'None'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMatchProduct(product.id, 'keep')}
                                    >
                                        <Check className="mr-1 h-3 w-3" />
                                        Keep as New
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {unmatchedProducts.length === 0 && (
                            <p className="text-center text-gray-500 py-8">No unmatched products!</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Set Initial Stock Dialog */}
            <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Starting Inventory</DialogTitle>
                        <DialogDescription>
                            How many units of {stockProduct?.name} do you currently have in stock?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Current Stock Quantity</Label>
                            <Input
                                type="number"
                                min="0"
                                value={stockValue}
                                onChange={(e) => setStockValue(e.target.value)}
                                placeholder="e.g., 50"
                            />
                            <p className="text-sm text-gray-500">
                                We'll track inventory from this starting point as you import sales.
                            </p>
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

            <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="max-w-sm" />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        Stock
                                        <div className="group relative">
                                            <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                Set starting inventory to track stock levels
                                            </div>
                                        </div>
                                    </div>
                                </TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="h-8 w-8 text-gray-300" />
                                            <p>No products found.</p>
                                            <p className="text-sm">Add products manually or import sales data.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product) => {
                                    const stockInfo = getStockDisplay(product);
                                    return (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{product.category || '—'}</TableCell>
                                            <TableCell>
                                                {stockInfo.isSet ? (
                                                    <span className={`font-medium ${parseInt(stockInfo.value) < 10 ? 'text-orange-600' : 'text-gray-900'}`}>
                                                        {stockInfo.value}
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => openStockDialog(product)}
                                                        className="text-gray-400 hover:text-blue-600 underline underline-offset-2 transition-colors"
                                                    >
                                                        Not set
                                                    </button>
                                                )}
                                            </TableCell>
                                            <TableCell>${product.sellingPrice?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openStockDialog(product)} title="Set stock">
                                                    <Package className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}>
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
    );
}
