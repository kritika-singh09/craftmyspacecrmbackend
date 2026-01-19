import express from 'express';
import * as safetyController from '../controllers/safetyController.js';
import { protect as authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Policies
router.get('/policies', safetyController.getPolicies);
router.post('/policies', safetyController.createPolicy);

// PPE
router.get('/ppe', safetyController.getPPEInventory);
router.post('/ppe', safetyController.addPPEItem);
router.post('/ppe/issue', safetyController.issuePPE);

// Checklists
router.post('/checklists', safetyController.submitChecklist);
router.get('/checklists', safetyController.getChecklists);

// Incidents
router.post('/incidents', safetyController.reportIncident);
router.get('/incidents', safetyController.getIncidents);

// Training
router.post('/training', safetyController.addTrainingRecord);
router.get('/training', safetyController.getTrainingRecords);

// Stats
router.get('/stats', safetyController.getSafetyStats);

export default router;
