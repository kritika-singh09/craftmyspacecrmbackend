import Document from '../../models/construction/document.js';
import { emitToCompany } from '../../config/socket.js';

// @desc    Create a new document entry (v1)
// @route   POST /api/documents
export const createDocument = async (req, res) => {
    try {
        const { project, name, category, discipline, fileUrl, fileSize, tags, expiryDate } = req.body;

        const document = await Document.create({
            project,
            name,
            category,
            discipline,
            fileUrl,
            fileSize,
            tags,
            expiryDate,
            company: req.user.company,
            uploadedBy: req.user._id,
            status: 'Submitted' // Auto-submit for review
        });

        // ⚡ WS: Notify HQ
        emitToCompany(req.user.company, 'DOCUMENT_UPLOADED', {
            documentId: document._id,
            name: document.name,
            uploadedBy: req.user.name
        });

        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload a new version of an existing document
// @route   POST /api/documents/:id/version
export const createRevision = async (req, res) => {
    try {
        const parentDoc = await Document.findById(req.params.id);
        if (!parentDoc) return res.status(404).json({ message: 'Parent document not found' });

        const { fileUrl, fileSize, revisionNotes } = req.body;

        // Mark old version as not latest
        await Document.updateMany(
            { $or: [{ _id: parentDoc._id }, { parentDocument: parentDoc._id }] },
            { isLatest: false }
        );

        const newVersionNum = `v${parseInt((parentDoc.version || 'v1').slice(1)) + 1}`;

        const revision = await Document.create({
            project: parentDoc.project,
            company: parentDoc.company,
            name: parentDoc.name,
            category: parentDoc.category,
            discipline: parentDoc.discipline,
            parentDocument: parentDoc.parentDocument || parentDoc._id,
            version: newVersionNum,
            revisionNotes,
            fileUrl,
            fileSize,
            uploadedBy: req.user._id,
            status: 'Submitted',
            isLatest: true
        });

        emitToCompany(req.user.company, 'DOCUMENT_VERSIONED', {
            documentId: revision._id,
            name: revision.name,
            version: revision.version
        });

        res.status(201).json(revision);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update document approval status
// @route   PUT /api/documents/:id/status
export const updateDocumentStatus = async (req, res) => {
    try {
        const { status, comments: approvalComment } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) return res.status(404).json({ message: 'Document not found' });

        document.status = status;
        document.approvals.push({
            user: req.user._id,
            role: req.user.role,
            status,
            comments: approvalComment,
            updatedAt: new Date()
        });

        await document.save();

        emitToCompany(req.user.company, 'DOCUMENT_STATUS_CHANGED', {
            documentId: document._id,
            status,
            name: document.name
        });

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add comment to document discussion
// @route   POST /api/documents/:id/comments
export const addDocumentComment = async (req, res) => {
    try {
        const { text } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) return res.status(404).json({ message: 'Document not found' });

        document.comments.push({
            user: req.user._id,
            userName: req.user.name,
            text,
            createdAt: new Date()
        });

        await document.save();
        res.status(201).json(document.comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all documents (filtering by latest versions)
// @route   GET /api/documents
export const getDocuments = async (req, res) => {
    try {
        const query = { company: req.user.company };
        if (req.query.projectId) query.project = req.query.projectId;
        if (req.query.discipline) query.discipline = req.query.discipline;

        // Default to latest versions only unless requested specifically
        if (req.query.allVersions !== 'true') {
            query.isLatest = true;
        }

        const documents = await Document.find(query)
            .sort({ createdAt: -1 })
            .populate('uploadedBy', 'name')
            .populate('parentDocument', 'version');

        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (document && document.company.toString() === req.user.company.toString()) {
            await document.deleteOne();
            res.json({ message: 'Document removed' });
        } else {
            res.status(404).json({ message: 'Document not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
