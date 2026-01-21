import express from 'express';
import { createWorker, getWorkers, updateWorker, deleteWorker, updateAttendance, addAdvance, settleWorker, getNextId } from '../../controllers/construction/workerController.js';

const router = express.Router();

// Utility routes
router.get('/next-id', getNextId);

// Basic routes
router.get('/', getWorkers);
router.post('/', createWorker);

// Specific ID routes first
router.put('/:id/attendance', updateAttendance);
router.post('/:id/advance', addAdvance);
router.post('/:id/settle', settleWorker);

// General ID routes
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);

export default router;
