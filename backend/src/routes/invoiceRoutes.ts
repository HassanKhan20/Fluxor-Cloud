import { Router } from 'express';
import multer from 'multer';
import { uploadInvoice, getInvoices, getInvoiceDetails, confirmInvoice, reprocessInvoice } from '../controllers/invoiceController';
import { authenticateToken } from '../middleware/auth';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.get('/:id', getInvoiceDetails);
router.post('/upload', upload.single('file'), uploadInvoice);
router.post('/:id/confirm', confirmInvoice);
router.post('/:id/reprocess', reprocessInvoice);

export default router;
