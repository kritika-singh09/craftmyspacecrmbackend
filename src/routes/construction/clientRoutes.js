import express from 'express';
import {
    createClient,
    getClients,
    getClientById,
    updateClient,
    deleteClient
} from '../../controllers/construction/clientController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // Apply auth middleware to all routes

router.route('/')
    .get(getClients)
    .post(createClient);

router.route('/:id')
    .get(getClientById)
    .put(updateClient)
    .delete(deleteClient);

export default router;
