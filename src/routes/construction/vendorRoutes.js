import express from 'express';
import {
    createVendor, getVendors, updatePerformanceScore, trackRateHistory,
    getVendorRecommendation, blacklistVendor, getPerformanceHistory, getRateHistory
} from '../../controllers/construction/vendorController.js';
import {
    createPO, submitForApproval, approvePO, issuePO,
    recordDelivery, closePO, getPurchaseOrders
} from '../../controllers/construction/purchaseOrderController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Vendor Routes
router.route('/vendors')
    .post(protect, createVendor)
    .get(protect, getVendors);

router.put('/vendors/:id/performance', protect, updatePerformanceScore);
router.post('/vendors/:id/rate-history', protect, trackRateHistory);
router.get('/vendors/recommend/:materialId', protect, getVendorRecommendation);
router.put('/vendors/:id/blacklist', protect, blacklistVendor);
router.get('/vendors/:id/performance-history', protect, getPerformanceHistory);
router.get('/vendors/:id/rate-history/:materialId', protect, getRateHistory);

// Purchase Order Routes
router.route('/purchase-orders')
    .post(protect, createPO)
    .get(protect, getPurchaseOrders);

router.put('/purchase-orders/:id/submit', protect, submitForApproval);
router.put('/purchase-orders/:id/approve', protect, approvePO);
router.put('/purchase-orders/:id/issue', protect, issuePO);
router.put('/purchase-orders/:id/delivery', protect, recordDelivery);
router.put('/purchase-orders/:id/close', protect, closePO);

export default router;
