import express from 'express';
import {
    registerCompany, registerSuperAdmin, registerUser, loginUser,
    getUsers, getCompanies, getUserTimeline, getUserAssignments
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js'; // Fixed typo: middlewares vs middleware

const router = express.Router();

router.get('/users', getUsers);
router.get('/companies', getCompanies);
router.get('/users/:id/timeline', protect, getUserTimeline);
router.get('/users/:id/assignments', protect, getUserAssignments);
router.post('/register', registerCompany);
router.post('/register-superadmin', registerSuperAdmin);
router.post('/register-user', registerUser);
router.post('/login', loginUser);

export default router;
