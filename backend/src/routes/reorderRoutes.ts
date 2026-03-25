import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getReorderList, generateReorderEmail, markAsOrdered } from '../controllers/reorderController';

const router = Router();
router.use(authenticateToken);

router.get('/', getReorderList);
router.post('/email', generateReorderEmail);
router.post('/mark-ordered', markAsOrdered);

export default router;
