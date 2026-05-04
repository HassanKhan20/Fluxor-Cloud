import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { fetchScanDataPreview, downloadScanData, type ScanDataPreview } from '@/lib/scanDataApi';
import { Download, AlertTriangle, FileText, Calendar, CheckCircle2 } from 'lucide-react';

function previousSunday(): string {
    const d = new Date();
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - dow - 7);
    return d.toISOString().slice(0, 10);
}

export default function ScanData() {
    const [weekStart, setWeekStart] = useState<string>(previousSunday());
    const [preview, setPreview] = useState<ScanDataPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<'altria' | 'rjr' | null>(null);
    const [lastDownload, setLastDownload] = useState<string | null>(null);

    async function load(week: string) {
        const token = localStorage.getItem('token');
        if (!token) { setError('Not authenticated'); return; }
        setLoading(true);
        setError(null);
        try {
            const p = await fetchScanDataPreview(token, week);
            setPreview(p);
        } catch (e: any) {
            setError(e?.message || 'Failed to load preview');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(weekStart); /* eslint-disable-next-line */ }, [weekStart]);

    async function handleDownload(program: 'altria' | 'rjr') {
        const token = localStorage.getItem('token');
        if (!token) return;
        setDownloading(program);
        setLastDownload(null);
        try {
            const result = await downloadScanData(token, program, weekStart);
            setLastDownload(`Downloaded ${program.toUpperCase()} file with ${result.rowCount} rows${result.skipped > 0 ? ` (${result.skipped} skipped — see missing UPC list)` : ''}.`);
        } catch (e: any) {
            setError(e?.message || 'Download failed');
        } finally {
            setDownloading(null);
        }
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-indigo-700 mb-1">
                        <FileText className="w-3 h-3" /> Tobacco Scan-Data
                    </div>
                    <h1 className="text-2xl font-display font-semibold text-ink-900 tracking-tight">Weekly Scan-Data Export</h1>
                    <p className="mt-1.5 text-[14px] text-ink-600 max-w-2xl">
                        Generate the weekly file Altria's Digital Trade Program and RJR's RMSC require for rebate eligibility. Pick a week, review what's eligible, then download.
                    </p>
                </div>

                {/* Week picker — stacks vertically on phones for thumb access */}
                <div className="bg-white rounded-2xl border border-ink-200 p-4 sm:p-5 mb-5">
                    <label className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
                            <Calendar className="w-4 h-4 text-ink-500" />
                            Week starting
                        </span>
                        <input
                            type="date"
                            value={weekStart}
                            onChange={e => setWeekStart(e.target.value)}
                            className="border border-ink-200 rounded-lg px-3 py-2 sm:py-1.5 text-[14px] sm:text-[13px] font-mono focus:outline-none focus:border-indigo-400 w-full sm:w-auto"
                        />
                        {preview && (
                            <span className="text-[12px] text-ink-500 font-mono">
                                → {preview.weekEnd}
                            </span>
                        )}
                    </label>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 mb-5 text-[13px] flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {lastDownload && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 mb-5 text-[13px] flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{lastDownload}</span>
                    </div>
                )}

                {/* Preview metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <MetricCard label="Eligible rows" value={loading ? '…' : (preview?.eligibleRows ?? 0)} hint="Tobacco transactions with UPC" />
                    <MetricCard label="Distinct SKUs" value={loading ? '…' : (preview?.distinctTobaccoSkus ?? 0)} hint="Tobacco products sold this week" />
                    <MetricCard
                        label="Missing UPC"
                        value={loading ? '…' : (preview?.missingUpcCount ?? 0)}
                        hint={preview && preview.missingUpcCount > 0 ? 'These SKUs are blocked from submission' : 'All eligible SKUs have a UPC'}
                        warn={!!preview && preview.missingUpcCount > 0}
                    />
                </div>

                {/* Download buttons */}
                <div className="bg-white rounded-2xl border border-ink-200 p-5 mb-5">
                    <h2 className="text-[15px] font-semibold text-ink-900 mb-1">Download</h2>
                    <p className="text-[12.5px] text-ink-500 mb-4">
                        Submit these files to your scan-data aggregator (e.g. Skupos, FasTraxPOS, CSI Works) or directly to the manufacturer's portal.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={() => handleDownload('altria')}
                            disabled={downloading !== null || !preview || preview.eligibleRows === 0}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-medium text-[13.5px] transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            {downloading === 'altria' ? 'Generating…' : 'Altria DTP (CSV)'}
                        </button>
                        <button
                            onClick={() => handleDownload('rjr')}
                            disabled={downloading !== null || !preview || preview.eligibleRows === 0}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-medium text-[13.5px] transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            {downloading === 'rjr' ? 'Generating…' : 'RJR RMSC (pipe-delimited)'}
                        </button>
                    </div>
                    {preview && preview.eligibleRows === 0 && !loading && (
                        <p className="mt-3 text-[12px] text-ink-500 italic">
                            No tobacco transactions with UPC found in this week. Ensure tobacco SKUs have a UPC/barcode and a category like "Cigarettes" or "Tobacco".
                        </p>
                    )}
                </div>

                {/* Missing UPC list */}
                {preview && preview.missingUpcProducts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-amber-700" />
                            <h3 className="text-[14px] font-semibold text-amber-900">
                                {preview.missingUpcProducts.length} tobacco SKU{preview.missingUpcProducts.length === 1 ? '' : 's'} missing UPC
                            </h3>
                        </div>
                        <p className="text-[12.5px] text-amber-800 mb-3">
                            These products were sold this week but have no UPC/barcode, so they cannot be submitted to scan-data. Add a UPC to include them next week.
                        </p>
                        <ul className="space-y-1">
                            {preview.missingUpcProducts.slice(0, 30).map(p => (
                                <li key={p.id} className="text-[12.5px] font-mono text-amber-900">• {p.name}</li>
                            ))}
                            {preview.missingUpcProducts.length > 30 && (
                                <li className="text-[12px] italic text-amber-700">+ {preview.missingUpcProducts.length - 30} more</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function MetricCard({ label, value, hint, warn }: { label: string; value: number | string; hint: string; warn?: boolean }) {
    return (
        <div className={`bg-white rounded-2xl border ${warn ? 'border-amber-200' : 'border-ink-200'} p-4`}>
            <div className={`text-[10.5px] font-mono uppercase tracking-[0.14em] mb-1 ${warn ? 'text-amber-700' : 'text-ink-500'}`}>
                {label}
            </div>
            <div className={`text-2xl font-semibold tracking-tight ${warn ? 'text-amber-900' : 'text-ink-900'}`}>{value}</div>
            <div className="text-[11.5px] text-ink-500 mt-0.5">{hint}</div>
        </div>
    );
}
