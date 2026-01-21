import express from 'express';
import multer from 'multer';
import * as labourController from '../../controllers/labourController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage (required for Vercel/Serverless)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all labour workers
router.get('/', protect, labourController.getAllLabour);

// Add new labour worker (with photo upload)
router.post('/', protect, upload.single('photo'), labourController.addLabour);

// Update labour worker
router.put('/:id', protect, upload.single('photo'), labourController.updateLabour);

// Mark attendance
router.put('/:id/attendance', protect, labourController.markAttendance);

// Add advance
router.post('/:id/advance', protect, labourController.addAdvance);

// Settle account
router.post('/:id/settle', protect, labourController.settleAccount);

// Delete labour worker (soft delete)
router.delete('/:id', protect, labourController.deleteLabour);

export default router;
