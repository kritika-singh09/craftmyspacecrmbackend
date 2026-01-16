import express from 'express';
import {
    trackCompliance, getExpiringCompliance, getComplianceDocuments,
    getProjectRiskScore, getAllRiskScores, sendComplianceAlerts
} from '../../controllers/construction/complianceController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Compliance Tracking Routes
router.route('/track')
    .post(protect, trackCompliance);

router.get('/documents', protect, getComplianceDocuments);
router.get('/expiring', protect, getExpiringCompliance);
router.post('/send-alerts', protect, sendComplianceAlerts);

// Risk Score Routes
router.get('/risk-score/:projectId', protect, getProjectRiskScore);
router.get('/risk-scores', protect, getAllRiskScores);

export default router;
