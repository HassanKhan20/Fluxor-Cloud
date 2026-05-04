import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getCycleCountList, submitCycleCount } from '../controllers/cycleCountController';

const router = Router();
router.use(authenticateToken);

router.get('/list', getCycleCountList);
router.post('/submit', submitCycleCount);

export default router;
