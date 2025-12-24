import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { Upload, FileImage, CheckCircle2, Clock, AlertCircle, Eye, Sparkles, ChevronLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import type { Invoice } from '@/types';

export default function Invoices() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [extractedData, setExtractedData] = useState<any>(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const data = await api.get('/invoices', token || '');
            setInvoices(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setExtractedData(null);

            // Create preview for images
            if (selectedFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setFilePreview(e.target?.result as string);
                };
                reader.readAsDataURL(selectedFile);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/invoices/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                // Use real AI-parsed data
                const parseResult = data.parse_result;
                setExtractedData({
                    supplier: parseResult?.invoice_metadata?.supplier_name || 'Unknown Supplier',
                    invoiceNumber: parseResult?.invoice_metadata?.invoice_number,
                    date: parseResult?.invoice_metadata?.invoice_date || new Date().toLocaleDateString(),
                    total: parseResult?.invoice_metadata?.total || data.invoice?.totalAmount || 0,
                    subtotal: parseResult?.invoice_metadata?.subtotal,
                    taxes: parseResult?.invoice_metadata?.taxes,
                    items: parseResult?.line_items?.map((item: any) => ({
                        name: item.description,
                        qty: item.quantity,
                        price: item.unit_cost,
                        lineTotal: item.line_total,
                        matchedProduct: item.matched_product_name,
                        confidence: item.confidence
                    })) || [],
                    alerts: parseResult?.pricing_alerts || [],
                    anomalies: parseResult?.anomalies || [],
                    insights: parseResult?.business_insights || [],
                    confidence: parseResult?.confidence || 0,
                    needsReview: parseResult?.needs_review || false,
                    invoiceId: data.invoice?.id
                });
            } else {
                const error = await response.json();
                alert(error.message || 'Upload failed');
            }
            fetchInvoices();
        } catch (error) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PARSED':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Parsed
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
                        <Clock className="w-3 h-3" />
                        Processing
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {status}
                    </span>
                );
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Invoice OCR</h1>
                            <p className="text-gray-500 mt-1">Upload invoices and we'll automatically extract the data</p>
                        </div>
                    </div>

                    {/* Upload Section with Split View */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Upload Area */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-600" />
                                    AI-Powered Extraction
                                </CardTitle>
                                <CardDescription>Upload an invoice image or PDF</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Preview Area */}
                                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${filePreview ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}>
                                    {filePreview ? (
                                        <div className="space-y-4">
                                            <img
                                                src={filePreview}
                                                alt="Invoice preview"
                                                className="max-h-64 mx-auto rounded-lg shadow-md"
                                            />
                                            <p className="text-sm text-gray-500">{file?.name}</p>
                                        </div>
                                    ) : (
                                        <div className="py-8">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FileImage className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-600 font-medium">Drop invoice here</p>
                                            <p className="text-sm text-gray-400 mt-1">Supports PNG, JPG, PDF</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <label className="flex-1 cursor-pointer">
                                        <Input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <Button variant="outline" className="w-full" asChild>
                                            <span>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Choose File
                                            </span>
                                        </Button>
                                    </label>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={!file || uploading}
                                        className="flex-1"
                                    >
                                        {uploading ? (
                                            <>
                                                <Clock className="mr-2 h-4 w-4 animate-spin" />
                                                Processing OCR...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Extract Data
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Extracted Data */}
                        <Card className={extractedData ? 'border-green-200 bg-green-50/30' : ''}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {extractedData ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-gray-400" />
                                    )}
                                    Extracted Data
                                </CardTitle>
                                <CardDescription>
                                    {extractedData ? 'Data automatically extracted from your invoice' : 'Upload an invoice to see extracted data'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {extractedData ? (
                                    <div className="space-y-4">
                                        {/* Confidence Banner */}
                                        <div className={`p-3 rounded-lg flex items-center justify-between ${extractedData.confidence >= 0.9 ? 'bg-green-100 text-green-800' :
                                                extractedData.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            <span className="text-sm font-medium">
                                                AI Confidence: {(extractedData.confidence * 100).toFixed(0)}%
                                            </span>
                                            {extractedData.needsReview && (
                                                <span className="text-xs bg-white/50 px-2 py-1 rounded">Needs Review</span>
                                            )}
                                        </div>

                                        {/* Summary */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded-lg border">
                                                <p className="text-xs text-gray-500 uppercase">Supplier</p>
                                                <p className="font-semibold text-gray-900">{extractedData.supplier}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border">
                                                <p className="text-xs text-gray-500 uppercase">Total</p>
                                                <p className="font-semibold text-gray-900">${(extractedData.total || 0).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Alerts */}
                                        {extractedData.alerts?.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-gray-700">⚠️ Pricing Alerts</p>
                                                {extractedData.alerts.slice(0, 3).map((alert: any, i: number) => (
                                                    <div key={i} className={`p-2 rounded-lg text-sm ${alert.severity === 'high' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                            alert.severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                                                'bg-blue-50 text-blue-700 border border-blue-200'
                                                        }`}>
                                                        <span className="font-medium">{alert.product_name}:</span> {alert.message}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Items */}
                                        <div className="bg-white rounded-lg border overflow-hidden">
                                            <div className="px-3 py-2 bg-gray-50 border-b">
                                                <p className="text-sm font-medium text-gray-700">Extracted Items ({extractedData.items?.length || 0})</p>
                                            </div>
                                            <div className="divide-y max-h-48 overflow-auto">
                                                {extractedData.items?.map((item: any, i: number) => (
                                                    <div key={i} className="px-3 py-2 flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">{item.name}</p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <span>Qty: {item.qty}</span>
                                                                {item.matchedProduct && (
                                                                    <span className="text-green-600">✓ {item.matchedProduct}</span>
                                                                )}
                                                                {!item.matchedProduct && (
                                                                    <span className="text-orange-500">⚠ Unmatched</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="font-medium text-gray-900">${(item.price || 0).toFixed(2)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Insights */}
                                        {extractedData.insights?.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-gray-700">💡 Business Insights</p>
                                                {extractedData.insights.map((insight: any, i: number) => (
                                                    <div key={i} className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                                                        <p className="font-medium text-purple-800">{insight.title}</p>
                                                        <p className="text-purple-600 text-xs mt-1">{insight.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <Button
                                            className="w-full"
                                            onClick={async () => {
                                                if (!extractedData.invoiceId) return;
                                                const token = localStorage.getItem('token');
                                                try {
                                                    const res = await fetch(`${import.meta.env.VITE_API_URL}/invoices/${extractedData.invoiceId}/confirm`, {
                                                        method: 'POST',
                                                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                                                    });
                                                    if (res.ok) {
                                                        alert('✅ Inventory updated successfully!');
                                                        setExtractedData(null);
                                                        setFile(null);
                                                        setFilePreview(null);
                                                        fetchInvoices();
                                                    }
                                                } catch (e) {
                                                    alert('Failed to confirm invoice');
                                                }
                                            }}
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Confirm & Update Inventory
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Eye className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400">No data extracted yet</p>
                                        <p className="text-sm text-gray-300 mt-1">Upload an invoice to get started</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Invoices */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Invoices</CardTitle>
                            <CardDescription>History of uploaded and processed invoices</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                No invoices found. Upload your first invoice above.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        invoices.map((invoice) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{invoice.supplierName || 'Unknown'}</TableCell>
                                                <TableCell>${invoice.totalAmount?.toFixed(2)}</TableCell>
                                                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">View Details</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
