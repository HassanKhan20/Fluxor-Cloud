import { Router } from 'express';
import { getAlerts, getUnreadCount, markAsRead, markAllAsRead, generateAlerts } from '../controllers/alertsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all alerts
router.get('/', getAlerts);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Generate new alerts
router.post('/generate', generateAlerts);

// Mark single alert as read
router.post('/:id/read', markAsRead);

// Mark all as read
router.post('/mark-all-read', markAllAsRead);

export default router;

