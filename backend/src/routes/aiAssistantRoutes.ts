import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { audioUpload } from '../middleware/upload';
import { handleVoiceCommand, aiHealth } from '../controllers/aiAssistantController';

const router = Router();
router.use(authenticateToken);

router.get('/health', aiHealth);
router.post('/voice', audioUpload.single('audio'), handleVoiceCommand);

export default router;
