import express from 'express';
import {
    createTransaction, getTransactions, approveTransaction, updateTransactionStatus,
    getBudgetHealth, getCashFlowForecast
} from '../controllers/financeController.js';
import {
    createPaymentRequest, verifyPaymentRequest, releasePayment,
    getPaymentRequests, rejectPaymentRequest
} from '../controllers/paymentController.js';
import {
    getCOA, createCOA, setupDefaultCOA
} from '../controllers/financeController.js';
import {
    createInvoice, getInvoices, updateInvoiceStatus
} from '../controllers/invoiceController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Transaction Routes
router.route('/transactions')
    .post(protect, createTransaction)
    .get(protect, getTransactions);

router.put('/transactions/:id/approve', protect, approveTransaction);
router.put('/transactions/:id/status', protect, updateTransactionStatus);

// Payment Request Routes
router.route('/payment-requests')
    .post(protect, createPaymentRequest)
    .get(protect, getPaymentRequests);

router.put('/payment-request/:id/verify', protect, verifyPaymentRequest);
router.put('/payment-request/:id/release', protect, releasePayment);
router.put('/payment-request/:id/reject', protect, rejectPaymentRequest);

// COA Routes
router.route('/coa')
    .get(protect, getCOA)
    .post(protect, createCOA);
router.post('/coa/defaults', protect, setupDefaultCOA);

// Invoice Routes
router.route('/invoices')
    .get(protect, getInvoices)
    .post(protect, createInvoice);

router.put('/invoices/:id/status', protect, updateInvoiceStatus);

// Analytics Routes
router.get('/budget-health/:projectId', protect, getBudgetHealth);
router.get('/cash-flow', protect, getCashFlowForecast);

export default router;
