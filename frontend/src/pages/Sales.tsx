import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText } from 'lucide-react';

export default function Sales() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus('');

        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                setStatus('Success! Sales data ingested.');
                setFile(null);
            } else {
                setStatus('Failed to upload.');
            }
        } catch (error) {
            setStatus('Error uploading file.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Sales Data Import</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Upload POS Export</CardTitle>
                    <CardDescription>Upload your daily sales CSV file (receiptId, date, productName, barcode, quantity, unitPrice).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input id="picture" type="file" accept=".csv" onChange={handleFileChange} />
                    </div>

                    {file && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                        </div>
                    )}

                    <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                        {uploading ? 'Uploading...' : 'Ingest Sales Data'}
                    </Button>

                    {status && (
                        <p className={`text-sm text-center ${status.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
                            {status}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Format Guide</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">Ensure your CSV has the following headers:</p>
                    <code className="block bg-muted p-2 rounded text-xs select-all">
                        receiptId, date, productName, barcode, quantity, unitPrice
                    </code>
                </CardContent>
            </Card>
        </div>
    );
}
