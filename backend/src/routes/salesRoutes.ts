import { Router } from 'express';
import multer from 'multer';
import { uploadSalesCsv, validateSalesCsv } from '../controllers/salesController';
import { authenticateToken } from '../middleware/auth';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.use(authenticateToken);

// Validate CSV before import (preview)
router.post('/validate', upload.single('file'), validateSalesCsv);

// Upload and process CSV
router.post('/upload', upload.single('file'), uploadSalesCsv);

export default router;
