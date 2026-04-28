import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    getFacilityType, setFacilityType,
    listResidents, getResident, createResident, updateResident, archiveResident,
    upsertCensus, listCensus, autoFillCensusWeek,
    getPrepSheet, getTrayTickets,
    listSupplyItems, createSupplyItem, recordSupplyConsumption,
    getStockoutWatch, bulkLogMeal,
} from '../controllers/retirementController';

const router = Router();
router.use(authenticateToken);

// Facility type — master switch
router.get('/facility-type', getFacilityType);
router.post('/facility-type', setFacilityType);

// Residents
router.get('/residents', listResidents);
router.get('/residents/:id', getResident);
router.post('/residents', createResident);
router.patch('/residents/:id', updateResident);
router.post('/residents/:id/archive', archiveResident);

// Census
router.get('/census', listCensus);
router.post('/census', upsertCensus);
router.post('/census/auto-fill-week', autoFillCensusWeek);

// Prep + tray
router.get('/prep-sheet', getPrepSheet);
router.get('/tray-tickets', getTrayTickets);

// Supplies
router.get('/supplies', listSupplyItems);
router.post('/supplies', createSupplyItem);
router.post('/supplies/consumption', recordSupplyConsumption);

// Stockout prediction
router.get('/stockout-watch', getStockoutWatch);

// Bulk meal-choice tally — replaces per-tap logging when residents pick from a sheet
router.post('/log-meals-bulk', bulkLogMeal);

export default router;
