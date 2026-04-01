import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadInvoice, getInvoices, getInvoiceDetails, confirmInvoice, reprocessInvoice } from '../controllers/invoiceController';
import { authenticateToken } from '../middleware/auth';
import { invoiceUpload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.get('/:id', getInvoiceDetails);
router.post('/upload', (req: Request, res: Response, next: NextFunction) => {
    invoiceUpload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, uploadInvoice);
router.post('/:id/confirm', confirmInvoice);
router.post('/:id/reprocess', reprocessInvoice);

export default router;
