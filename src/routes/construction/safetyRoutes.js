import express from 'express';
import {
    reportIncident, createChecklist, getWorkerCertifications,
    checkWorkerSafetyStatus, getIncidents
} from '../../controllers/construction/safetyController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Safety Incident Routes
router.route('/incident')
    .post(protect, reportIncident);

router.get('/incidents', protect, getIncidents);

// Safety Checklist Routes
router.post('/checklist', protect, createChecklist);

// Safety Certification Routes
router.get('/certifications/:workerId', protect, getWorkerCertifications);
router.get('/worker-status/:workerId', protect, checkWorkerSafetyStatus);

export default router;
