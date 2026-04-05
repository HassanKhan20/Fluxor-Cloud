import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadSalesCsv, validateSalesCsv, exportSales } from '../controllers/salesController';
import { authenticateToken } from '../middleware/auth';
import { csvUpload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

function handleCsvUpload(req: Request, res: Response, next: NextFunction) {
    csvUpload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}

// Export sales as CSV
router.get('/export', exportSales);

// Validate CSV before import (preview)
router.post('/validate', handleCsvUpload, validateSalesCsv);

// Upload and process CSV
router.post('/upload', handleCsvUpload, uploadSalesCsv);

export default router;
