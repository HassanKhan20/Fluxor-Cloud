import { Router } from 'express';
import multer from 'multer';
import { uploadSalesCsv } from '../controllers/salesController';
import { authenticateToken } from '../middleware/auth';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.use(authenticateToken);

router.post('/upload', upload.single('file'), uploadSalesCsv);

export default router;
