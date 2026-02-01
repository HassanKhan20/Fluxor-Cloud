import { Router } from 'express';
import { getDashboardStats, getWeeklySummary, getMoneyWastedBreakdown } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/weekly-summary', getWeeklySummary);
router.get('/money-wasted', getMoneyWastedBreakdown);

export default router;

