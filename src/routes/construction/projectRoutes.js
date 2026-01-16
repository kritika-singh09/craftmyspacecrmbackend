import express from 'express';
import {
    createProject,
    getProjects,
    getProjectById,
    updateProject
} from '../../controllers/construction/projectController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createProject)
    .get(protect, getProjects);

router.route('/:id')
    .get(protect, getProjectById)
    .put(protect, updateProject);

export default router;
