import { Router } from 'express';
import { getTrends, getPredictions, getTopProducts, getInsights } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/trends', getTrends);
router.get('/predictions', getPredictions);
router.get('/top-products', getTopProducts);
router.get('/insights', getInsights);

export default router;
