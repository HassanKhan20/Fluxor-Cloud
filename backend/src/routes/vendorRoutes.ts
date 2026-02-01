import { Router } from 'express';
import { getVendors, getVendorProducts, compareVendors } from '../controllers/vendorController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all vendors with scorecards
router.get('/', getVendors);

// Compare specific vendors
router.get('/compare', compareVendors);

// Get products for a specific vendor
router.get('/:vendorName/products', getVendorProducts);

export default router;

