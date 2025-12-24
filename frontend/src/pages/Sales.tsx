import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, ChevronLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function Sales() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setStatus('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus('');
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (res.ok) {
                setStatus('success');
                setFile(null);
            } else {
                setStatus('error');
            }
        } catch (error) {
            clearInterval(progressInterval);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    const supportedSystems = [
        { name: 'Square POS', icon: '◼️' },
        { name: 'Clover', icon: '🍀' },
        { name: 'Toast', icon: '🍞' },
        { name: 'Lightspeed', icon: '⚡' },
    ];

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Sales Data Import</h1>
                            <p className="text-gray-500 mt-1">Import your POS data to start tracking sales and inventory</p>
                        </div>
                    </div>

                    {/* Main Upload Card */}
                    <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-8">
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center py-12 rounded-xl transition-all ${isDragging ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
                                    }`}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${status === 'success' ? 'bg-green-100' :
                                    status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                                    }`}>
                                    {status === 'success' ? (
                                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                                    ) : status === 'error' ? (
                                        <AlertCircle className="w-8 h-8 text-red-600" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-blue-600" />
                                    )}
                                </div>

                                {status === 'success' ? (
                                    <>
                                        <h3 className="text-xl font-semibold text-green-700 mb-2">Import Successful!</h3>
                                        <p className="text-gray-500 text-center max-w-md">
                                            Your sales data has been imported. Check your dashboard for updated insights.
                                        </p>
                                    </>
                                ) : status === 'error' ? (
                                    <>
                                        <h3 className="text-xl font-semibold text-red-700 mb-2">Import Failed</h3>
                                        <p className="text-gray-500 text-center max-w-md">
                                            There was an error processing your file. Please check the format and try again.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {file ? file.name : 'Drop your CSV file here'}
                                        </h3>
                                        <p className="text-gray-500 text-center max-w-md mb-6">
                                            or click to browse. Supports CSV exports from all major POS systems.
                                        </p>
                                    </>
                                )}

                                {/* Progress Bar */}
                                {uploading && (
                                    <div className="w-full max-w-md mb-6">
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-sm text-gray-500 text-center mt-2">
                                            Importing... {uploadProgress}%
                                        </p>
                                    </div>
                                )}

                                {!uploading && status !== 'success' && (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <label className="cursor-pointer">
                                            <Input
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <Button variant="outline" asChild>
                                                <span>
                                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                                    Choose File
                                                </span>
                                            </Button>
                                        </label>
                                        {file && (
                                            <Button onClick={handleUpload} disabled={uploading}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Import Sales Data
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {status === 'success' && (
                                    <Button onClick={() => { setStatus(''); setFile(null); }} className="mt-4">
                                        Import Another File
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected File Preview */}
                    {file && !uploading && status !== 'success' && (
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </CardContent>
                        </Card>
                    )}

                    {/* Supported Systems */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Supported POS Systems</CardTitle>
                            <CardDescription>Export your sales data as CSV from any of these systems</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {supportedSystems.map((system) => (
                                    <div
                                        key={system.name}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                    >
                                        <span className="text-2xl">{system.icon}</span>
                                        <span className="font-medium text-gray-700">{system.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Format Guide */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">CSV Format Guide</CardTitle>
                            <CardDescription>Ensure your CSV has these columns for best results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                <code>receiptId, date, productName, barcode, quantity, unitPrice</code>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                                <ArrowRight className="w-4 h-4" />
                                <span>We'll automatically match products and calculate totals</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
