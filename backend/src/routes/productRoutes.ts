import { Router } from 'express';
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getUnmatchedProducts,
    setInitialStock,
    bulkSetInitialStock,
    matchProduct
} from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getProducts);
router.get('/unmatched', getUnmatchedProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.patch('/:id/initial-stock', setInitialStock);
router.post('/:id/match', matchProduct);
router.post('/bulk-initial-stock', bulkSetInitialStock);
router.delete('/:id', deleteProduct);

export default router;
