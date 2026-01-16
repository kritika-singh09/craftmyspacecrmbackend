import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Document name is required'],
        trim: true
    },
    category: { // Document Type
        type: String,
        enum: ['Drawing', 'BOQ', 'Estimate', 'Contract', 'Invoice', 'Approval Letter', 'Site Photo', 'Legal Doc', 'Other'],
        default: 'Other'
    },
    discipline: {
        type: String,
        enum: ['Architecture', 'Interior', 'Structure', 'Electrical', 'Plumbing', 'HVAC', 'General'],
        default: 'General'
    },
    fileUrl: {
        type: String,
        required: [true, 'File URL is required']
    },
    fileSize: { type: String },
    fileHash: { type: String }, // For integrity/security
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    // 📂 VERSION CONTROL
    version: { type: String, default: 'v1' },
    revisionNotes: { type: String },
    parentDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }, // Links to v1 if this is v2
    isLatest: { type: Boolean, default: true },

    // ✅ APPROVAL LIFECYCLE
    status: {
        type: String,
        enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Archived'],
        default: 'Draft'
    },
    approvals: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        role: String,
        status: String,
        comments: String,
        updatedAt: { type: Date, default: Date.now }
    }],

    // 🔗 LINKS & TAGS
    tags: [String],
    linkedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectTask' },
    linkedDPR: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyReport' },

    // 📅 MAINTENANCE
    expiryDate: { type: Date },

    // 💬 INTERACTIVITY
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        userName: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],

    // 🕵️ AUDIT
    uploadedByDevice: { type: String },
    uploadedFromIP: { type: String }
}, {
    timestamps: true
});

export default mongoose.model('Document', documentSchema);
