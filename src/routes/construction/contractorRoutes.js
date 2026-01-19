import express from 'express';
import {
    createContractor,
    getContractors,
    getContractorById,
    updateContractor,
    deleteContractor
} from '../../controllers/construction/contractorController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getContractors)
    .post(createContractor);

router.route('/:id')
    .get(getContractorById)
    .put(updateContractor)
    .delete(deleteContractor);

export default router;
