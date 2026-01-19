import express from 'express';
import { createWorker, getWorkers, updateWorker, deleteWorker } from '../../controllers/construction/workerController.js';

const router = express.Router();

router.route('/')
    .get(getWorkers)
    .post(createWorker);

router.route('/:id')
    .put(updateWorker)
    .delete(deleteWorker);

export default router;
