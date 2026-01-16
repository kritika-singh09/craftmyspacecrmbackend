import express from 'express';
import {
    createTransaction, getTransactions, approveTransaction,
    getBudgetHealth, getCashFlowForecast
} from '../controllers/financeController.js';
import {
    createPaymentRequest, verifyPaymentRequest, releasePayment,
    getPaymentRequests, rejectPaymentRequest
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Transaction Routes
router.route('/transactions')
    .post(protect, createTransaction)
    .get(protect, getTransactions);

router.put('/transaction/:id/approve', protect, approveTransaction);

// Payment Request Routes
router.route('/payment-requests')
    .post(protect, createPaymentRequest)
    .get(protect, getPaymentRequests);

router.put('/payment-request/:id/verify', protect, verifyPaymentRequest);
router.put('/payment-request/:id/release', protect, releasePayment);
router.put('/payment-request/:id/reject', protect, rejectPaymentRequest);

// Analytics Routes
router.get('/budget-health/:projectId', protect, getBudgetHealth);
router.get('/cash-flow', protect, getCashFlowForecast);

export default router;
