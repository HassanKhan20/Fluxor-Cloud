import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { previewScanData, exportScanData } from '../controllers/scanDataController';

const router = Router();
router.use(authenticateToken);

router.get('/preview', previewScanData);
router.get('/export', exportScanData);

export default router;
