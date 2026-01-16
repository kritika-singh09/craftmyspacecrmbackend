import express from 'express';
import {
    createInspection, reportSnag, updateSnagStatus,
    verifyMaterialQuality, getSnags, getQualityMetrics
} from '../../controllers/construction/qualityController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Quality Inspection Routes
router.post('/inspection', protect, createInspection);

// Snag/Defect Routes
router.route('/snags')
    .post(protect, reportSnag)
    .get(protect, getSnags);

router.put('/snag/:id/status', protect, updateSnagStatus);

// Material Quality Routes
router.post('/material-verify', protect, verifyMaterialQuality);

// Quality Metrics
router.get('/metrics/:projectId', protect, getQualityMetrics);

export default router;
