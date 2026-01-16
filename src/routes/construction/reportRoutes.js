import express from 'express';
import { createReport, getReports, approveReport, addComment, getComparisonStats } from '../../controllers/construction/reportController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createReport)
    .get(protect, getReports);

router.route('/:id/approve')
    .put(protect, approveReport);

router.route('/:id/comments')
    .post(protect, addComment);

router.route('/stats/:projectId')
    .get(protect, getComparisonStats);

export default router;
