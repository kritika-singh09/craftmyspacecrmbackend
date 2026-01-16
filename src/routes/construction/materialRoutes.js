import express from 'express';
import {
    createMaterialMaster, getMaterialsMaster,
    getInventory, adjustStock,
    createRequest, approveRequest, issueMaterials, getRequests,
    verifyMaterialQuality, getMaterialQuality
} from '../../controllers/construction/materialController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Material Master Registry Routes
router.route('/master')
    .post(protect, createMaterialMaster)
    .get(protect, getMaterialsMaster);

// Inventory Management Routes
router.get('/inventory', protect, getInventory);
router.post('/inventory/adjustment', protect, adjustStock);

// Material Request Workflow Routes
router.route('/requests')
    .post(protect, createRequest)
    .get(protect, getRequests);

router.put('/requests/:id/approve', protect, approveRequest);
router.put('/requests/:id/issue', protect, issueMaterials);

// Material Quality Routes
router.post('/quality/verify', protect, verifyMaterialQuality);
router.get('/quality', protect, getMaterialQuality);

export default router;
