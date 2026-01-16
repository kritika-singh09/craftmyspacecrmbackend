import mongoose from 'mongoose';

// ========================================
// MATERIAL MASTER REGISTRY
// ========================================

const materialMasterSchema = new mongoose.Schema({
    itemCode: {
        type: String,
        unique: true,
        required: [true, 'Item code is required'],
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Material name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Cement', 'Steel', 'Electrical', 'Plumbing', 'Aggregates', 'Finishing', 'Other']
    },
    unit: {
        type: String,
        required: [true, 'Unit of measure is required'],
        enum: ['Bags', 'Tons', 'Kgs', 'Meters', 'Trucks', 'Pieces', 'Nos']
    },
    brand: {
        type: String,
        trim: true
    },
    grade: {
        type: String,
        trim: true
    },
    specifications: {
        type: String,
        trim: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

export const MaterialMaster = mongoose.model('MaterialMaster', materialMasterSchema);

// ========================================
// MATERIAL REQUEST WORKFLOW
// ========================================

const materialRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        unique: true,
        required: true
    },
    materialMaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialMaster',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0.1, 'Quantity must be greater than 0']
    },
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true // Site Engineer
    },
    approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration' // Supervisor
    },
    issuer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration' // Storekeeper
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'ISSUED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING'
    },
    priority: {
        type: String,
        enum: ['NORMAL', 'URGENT', 'CRITICAL'],
        default: 'NORMAL'
    },
    purpose: {
        type: String, // e.g., Slab Casting, Electrical Fit-out
        required: true
    },
    remarks: String,
    timeline: [{
        status: String,
        date: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        note: String
    }],
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

// Middleware to generate a unique request ID before saving
materialRequestSchema.pre('save', async function (next) {
    if (!this.requestId) {
        const count = await this.constructor.countDocuments();
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        this.requestId = `REQ-${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

export const MaterialRequest = mongoose.model('MaterialRequest', materialRequestSchema);

// ========================================
// MATERIAL QUALITY VERIFICATION
// ========================================

const materialQualitySchema = new mongoose.Schema({
    materialMaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialMaster',
        required: true
    },
    batch: {
        batchNumber: { type: String, required: true },
        quantity: { type: Number, required: true },
        receivedDate: { type: Date, default: Date.now }
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    testCertificates: [{
        certificateName: String,
        certificateUrl: String,
        testDate: Date,
        uploadedAt: { type: Date, default: Date.now }
    }],
    testDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date
    },
    qualityStatus: {
        type: String,
        enum: ['APPROVED', 'REJECTED', 'PENDING_INSPECTION', 'CONDITIONAL_APPROVAL'],
        default: 'PENDING_INSPECTION'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    inspectionDetails: {
        inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        inspectionDate: Date,
        testResults: [{
            parameter: String,
            expectedValue: String,
            actualValue: String,
            status: { type: String, enum: ['PASS', 'FAIL'] }
        }]
    },
    photos: [{
        fileName: String,
        fileUrl: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

// Index for quick batch lookup
materialQualitySchema.index({ 'batch.batchNumber': 1, materialMaster: 1 });

export const MaterialQuality = mongoose.model('MaterialQuality', materialQualitySchema);

// Default exports for backward compatibility
export default MaterialMaster;
