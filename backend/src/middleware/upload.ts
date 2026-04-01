import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_CSV_TYPES = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];

// Ensure uploads directory exists
const UPLOADS_DIR = 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Invoice upload: store with a stable filename so reprocessing can find it
const invoiceStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = `invoice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, unique);
    }
});

// Invoice upload: images and PDFs only, 10 MB max
export const invoiceUpload = multer({
    storage: invoiceStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed for invoices'));
        }
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)) {
            return cb(new Error('Invalid file extension'));
        }
        cb(null, true);
    }
});

// Sales CSV upload: CSV only, 5 MB max
export const csvUpload = multer({
    dest: UPLOADS_DIR,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.csv', '.tsv', '.txt'].includes(ext) && !ALLOWED_CSV_TYPES.includes(file.mimetype)) {
            return cb(new Error('Only CSV files are allowed for sales import'));
        }
        cb(null, true);
    }
});
