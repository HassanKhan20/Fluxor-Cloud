import { Router } from 'express';
import multer from 'multer';
import { uploadInvoice, getInvoices } from '../controllers/invoiceController';
import { authenticateToken } from '../middleware/auth';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.post('/upload', upload.single('file'), uploadInvoice);

export default router;
