import express from 'express';
import {
    createDocument,
    getDocuments,
    deleteDocument,
    createRevision,
    updateDocumentStatus,
    addDocumentComment
} from '../../controllers/construction/documentController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createDocument)
    .get(protect, getDocuments);

router.route('/:id')
    .delete(protect, deleteDocument);

router.route('/:id/version')
    .post(protect, createRevision);

router.route('/:id/status')
    .put(protect, updateDocumentStatus);

router.route('/:id/comments')
    .post(protect, addDocumentComment);

export default router;
