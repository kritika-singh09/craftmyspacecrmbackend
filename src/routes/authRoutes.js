import express from 'express';
import { registerCompany, registerSuperAdmin, registerUser, loginUser, getUsers, getCompanies } from '../controllers/authController.js';

const router = express.Router();

router.get('/users', getUsers);
router.get('/companies', getCompanies);
router.post('/register', registerCompany);
router.post('/register-superadmin', registerSuperAdmin);
router.post('/register-user', registerUser);
router.post('/login', loginUser);

export default router;
