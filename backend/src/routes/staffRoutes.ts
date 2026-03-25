import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    getStaff, createStaff, updateStaff, deleteStaff,
    getShifts, createShift, updateShift,
    getFlags, resolveFlag, createManualFlag,
    getStaffPerformance, detectShrinkage
} from '../controllers/staffController';

const router = Router();
router.use(authenticateToken);

// Staff CRUD
router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

// Shifts
router.get('/shifts', getShifts);
router.post('/shifts', createShift);
router.put('/shifts/:id', updateShift);

// Flags
router.get('/flags', getFlags);
router.patch('/flags/:id/resolve', resolveFlag);
router.post('/flags', createManualFlag);

// Analytics
router.get('/performance', getStaffPerformance);
router.post('/shrinkage-check', detectShrinkage);

export default router;
