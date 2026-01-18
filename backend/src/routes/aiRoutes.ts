import { Router } from 'express';
import { chat, healthCheck, explain } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// AI chat endpoint - requires authentication
router.post('/chat', authenticateToken, chat);

// Explain endpoint - get AI explanation of current patterns
router.get('/explain', authenticateToken, explain);

// Health check - public endpoint to check AI status
router.get('/health', healthCheck);

export default router;

