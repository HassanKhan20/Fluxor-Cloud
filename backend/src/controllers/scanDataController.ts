import { Request, Response } from 'express';
import { getStoreId } from '../lib/storeContext';
import { buildScanDataExport, previewScanDataExport, ScanDataProgram } from '../services/scanDataService';

function parseWeekStart(input: string | undefined): Date {
    if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 7);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }
    return new Date(`${input}T00:00:00.000Z`);
}

function endOfWeek(weekStart: Date): Date {
    const end = new Date(weekStart);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return end;
}

export const previewScanData = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const weekStart = parseWeekStart(req.query.weekStart as string | undefined);
        const weekEnd = endOfWeek(weekStart);
        const preview = await previewScanDataExport(storeId, weekStart, weekEnd);
        res.json({
            weekStart: weekStart.toISOString().slice(0, 10),
            weekEnd: weekEnd.toISOString().slice(0, 10),
            ...preview
        });
    } catch (err: any) {
        console.error('[ScanData] Preview failed:', err);
        res.status(500).json({ message: err?.message || 'Preview failed' });
    }
};

export const exportScanData = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ message: 'No active store found' });

        const programRaw = String(req.query.program || '').toLowerCase();
        if (programRaw !== 'altria' && programRaw !== 'rjr') {
            return res.status(400).json({ message: 'program must be "altria" or "rjr"' });
        }
        const program: ScanDataProgram = programRaw;

        const weekStart = parseWeekStart(req.query.weekStart as string | undefined);
        const weekEnd = endOfWeek(weekStart);

        const result = await buildScanDataExport(storeId, program, weekStart, weekEnd);

        // If client wants JSON (for previewing in UI before download), return structured
        if (String(req.query.format || '').toLowerCase() === 'json') {
            return res.json(result);
        }

        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.setHeader('X-Scan-Data-Rows', String(result.rowCount));
        res.setHeader('X-Scan-Data-Skipped', String(result.skippedReasons.length));
        res.send(result.fileBody);
    } catch (err: any) {
        console.error('[ScanData] Export failed:', err);
        res.status(500).json({ message: err?.message || 'Export failed' });
    }
};
