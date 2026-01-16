import mongoose from 'mongoose';

// ========================================
// QUALITY INSPECTION
// ========================================

const qualityInspectionSchema = new mongoose.Schema({
    inspectionId: {
        type: String,
        unique: true,
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    activity: {
        type: String,
        enum: ['FOUNDATION', 'RCC', 'MASONRY', 'PLUMBING', 'ELECTRICAL', 'FINISHING', 'WATERPROOFING', 'OTHER'],
        required: true
    },
    checklist: [{
        item: String,
        expectedStandard: String,
        actualResult: String,
        status: { type: String, enum: ['PASS', 'FAIL', 'NA'], default: 'NA' }
    }],
    overallStatus: {
        type: String,
        enum: ['PASS', 'FAIL', 'CONDITIONAL_PASS'],
        required: true
    },
    inspector: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    photos: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    boqItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BOQItem'
    },
    remarks: {
        type: String,
        default: ''
    },
    failureReason: {
        type: String,
        default: ''
    },
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

// Auto-generate inspection ID: QI-YYMMDD-00001
qualityInspectionSchema.pre('save', async function (next) {
    if (!this.inspectionId) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        const count = await this.constructor.countDocuments({
            inspectionId: new RegExp(`^QI-${datePrefix}`)
        });

        this.inspectionId = `QI-${datePrefix}-${(count + 1).toString().padStart(5, '0')}`;
    }
    next();
});

export const QualityInspection = mongoose.model('QualityInspection', qualityInspectionSchema);

// ========================================
// SNAG/DEFECT MANAGEMENT
// ========================================

const snagDefectSchema = new mongoose.Schema({
    snagId: {
        type: String,
        unique: true,
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    defectType: {
        type: String,
        enum: ['STRUCTURAL', 'FINISHING', 'PLUMBING', 'ELECTRICAL', 'WATERPROOFING', 'PAINTING', 'OTHER'],
        required: true
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        required: true
    },
    contractor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    photos: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    targetResolutionDate: {
        type: Date,
        required: true
    },
    actualResolutionDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['OPEN', 'FIXED', 'VERIFIED', 'CLOSED', 'REJECTED'],
        default: 'OPEN'
    },
    reworkCost: {
        type: Number,
        default: 0
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration'
    },
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

// Auto-generate snag ID: SNAG-YYMMDD-00001
snagDefectSchema.pre('save', async function (next) {
    if (!this.snagId) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        const count = await this.constructor.countDocuments({
            snagId: new RegExp(`^SNAG-${datePrefix}`)
        });

        this.snagId = `SNAG-${datePrefix}-${(count + 1).toString().padStart(5, '0')}`;
    }
    next();
});

export const SnagDefect = mongoose.model('SnagDefect', snagDefectSchema);

// Default export for backward compatibility
export default QualityInspection;
