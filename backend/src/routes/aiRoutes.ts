import { Router } from 'express';
import { chat, healthCheck } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// AI chat endpoint - requires authentication
router.post('/chat', authenticateToken, chat);

// Health check - public endpoint to check AI status
router.get('/health', healthCheck);

export default router;
