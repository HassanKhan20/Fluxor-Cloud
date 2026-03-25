import { Router } from 'express';
import { getDashboardStats, getWeeklySummary, getMoneyWastedBreakdown, getCashFlow, getDailyBriefing } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/weekly-summary', getWeeklySummary);
router.get('/money-wasted', getMoneyWastedBreakdown);
router.get('/cash-flow', getCashFlow);
router.get('/daily-briefing', getDailyBriefing);

export default router;

