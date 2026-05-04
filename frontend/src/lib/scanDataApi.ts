import { API_URL } from './api';

export type ScanDataProgram = 'altria' | 'rjr';

export interface ScanDataPreview {
    weekStart: string;
    weekEnd: string;
    eligibleRows: number;
    distinctTobaccoSkus: number;
    missingUpcCount: number;
    missingUpcProducts: { id: string; name: string }[];
}

export async function fetchScanDataPreview(token: string, weekStart?: string): Promise<ScanDataPreview> {
    const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
    const res = await fetch(`${API_URL}/scan-data/preview${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
    return res.json();
}

// Triggers a file download in the browser.
export async function downloadScanData(token: string, program: ScanDataProgram, weekStart?: string): Promise<{ rowCount: number; skipped: number }> {
    const params = new URLSearchParams({ program });
    if (weekStart) params.set('weekStart', weekStart);
    const res = await fetch(`${API_URL}/scan-data/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Export failed: ${res.status} ${msg}`);
    }
    const rowCount = Number(res.headers.get('X-Scan-Data-Rows') || '0');
    const skipped = Number(res.headers.get('X-Scan-Data-Skipped') || '0');

    const blob = await res.blob();
    const disp = res.headers.get('Content-Disposition') || '';
    const match = /filename="([^"]+)"/.exec(disp);
    const fileName = match?.[1] || `${program}-scan-data.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return { rowCount, skipped };
}
