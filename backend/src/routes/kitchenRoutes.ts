import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    listVendors, createVendor, updateVendor,
    listMenuItems, createMenuItem, updateMenuItem, deleteMenuItem,
    listMealPlans, upsertMealPlan, deleteMealPlan, copyMealPlanWeek,
    recordConsumption, logMealServed,
    previewForecast, generateWeeklyDraftPOs,
    listPurchaseOrders, getPurchaseOrder, updatePurchaseOrderItems,
    approveAndSendPurchaseOrder, markPurchaseOrderReceived, cancelPurchaseOrder,
    submitWeeklyCounts, listVariances, acceptVarianceAdjustment,
    getKitchenConfig, updateKitchenConfig,
    enableKitchenMode, loadStarterPack,
} from '../controllers/kitchenController';

const router = Router();
router.use(authenticateToken);

// Config
router.get('/config', getKitchenConfig);
router.patch('/config', updateKitchenConfig);
router.post('/enable', enableKitchenMode);
router.post('/starter-pack', loadStarterPack);

// Vendors
router.get('/vendors', listVendors);
router.post('/vendors', createVendor);
router.patch('/vendors/:id', updateVendor);

// Menu items + recipes
router.get('/menu-items', listMenuItems);
router.post('/menu-items', createMenuItem);
router.patch('/menu-items/:id', updateMenuItem);
router.delete('/menu-items/:id', deleteMenuItem);

// Meal plans
router.get('/meal-plans', listMealPlans);
router.post('/meal-plans', upsertMealPlan);
router.delete('/meal-plans/:id', deleteMealPlan);
router.post('/meal-plans/copy-week', copyMealPlanWeek);

// Consumption
router.post('/consumption', recordConsumption);
router.post('/log-meal', logMealServed);

// Forecast + Purchase Orders
router.get('/forecast', previewForecast);
router.post('/purchase-orders/generate', generateWeeklyDraftPOs);
router.get('/purchase-orders', listPurchaseOrders);
router.get('/purchase-orders/:id', getPurchaseOrder);
router.patch('/purchase-orders/:id/items', updatePurchaseOrderItems);
router.post('/purchase-orders/:id/approve', approveAndSendPurchaseOrder);
router.post('/purchase-orders/:id/receive', markPurchaseOrderReceived);
router.post('/purchase-orders/:id/cancel', cancelPurchaseOrder);

// Variance
router.post('/variance', submitWeeklyCounts);
router.get('/variance', listVariances);
router.post('/variance/:id/accept', acceptVarianceAdjustment);

export default router;
