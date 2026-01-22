import express from 'express';
import { createWorker, getWorkers, updateWorker, deleteWorker, updateAttendance, updateBatchAttendance, addAdvance, settleWorker, getNextId } from '../../controllers/construction/workerController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Utility routes
router.get('/next-id', getNextId);

// Basic routes
router.get('/', getWorkers);
router.post('/', createWorker);

// Specific ID routes first
router.put('/:id/attendance', protect, updateAttendance);
router.put('/:id/attendance-batch', protect, updateBatchAttendance);
router.post('/:id/advance', protect, addAdvance);
router.post('/:id/settle', protect, settleWorker);

// General ID routes
router.put('/:id', protect, updateWorker);
router.delete('/:id', protect, deleteWorker);

export default router;
