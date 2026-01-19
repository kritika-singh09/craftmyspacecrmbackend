import express from 'express';
import {
    createPO,
    getPurchaseOrders,
    submitForApproval,
    approvePO,
    issuePO,
    closePO,
    recordDelivery
} from '../../controllers/construction/purchaseOrderController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .post(createPO)
    .get(getPurchaseOrders);

router.put('/:id/submit', submitForApproval);
router.put('/:id/approve', approvePO);
router.put('/:id/issue', issuePO);
router.put('/:id/close', closePO);
router.put('/:id/delivery', recordDelivery);

export default router;
