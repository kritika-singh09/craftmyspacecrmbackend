import mongoose from 'mongoose';

// ========================================
// SAFETY INCIDENT MANAGEMENT
// ========================================

const safetyIncidentSchema = new mongoose.Schema({
    incidentId: {
        type: String,
        unique: true,
        required: true
    },
    type: {
        type: String,
        enum: ['INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE'],
        required: true
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    photos: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    videos: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    witnesses: [{
        worker: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        statement: String
    }],
    immediateAction: {
        type: String,
        required: true
    },
    rootCause: {
        type: String,
        default: ''
    },
    correctiveAction: {
        description: String,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        targetDate: Date,
        status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' }
    },
    status: {
        type: String,
        enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
        default: 'OPEN'
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
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

// Auto-generate incident ID: INC-YYMMDD-00001
safetyIncidentSchema.pre('save', async function () {
    if (!this.incidentId) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        const count = await this.constructor.countDocuments({
            incidentId: new RegExp(`^INC-${datePrefix}`)
        });

        this.incidentId = `INC-${datePrefix}-${(count + 1).toString().padStart(5, '0')}`;
    }
});

export const SafetyIncident = mongoose.model('SafetyIncident', safetyIncidentSchema);

// ========================================
// SAFETY CHECKLIST
// ========================================

const safetyChecklistSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    inspector: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    ppeCompliance: {
        helmets: { type: Boolean, default: false },
        safetyShoes: { type: Boolean, default: false },
        gloves: { type: Boolean, default: false },
        harness: { type: Boolean, default: false },
        remarks: String
    },
    workAtHeight: {
        scaffoldingSecure: { type: Boolean, default: false },
        guardrailsInstalled: { type: Boolean, default: false },
        fallProtection: { type: Boolean, default: false },
        remarks: String
    },
    electricalSafety: {
        wiringCondition: { type: Boolean, default: false },
        earthingProper: { type: Boolean, default: false },
        isolationSwitches: { type: Boolean, default: false },
        remarks: String
    },
    scaffoldingInspection: {
        structuralIntegrity: { type: Boolean, default: false },
        loadCapacity: { type: Boolean, default: false },
        accessSafe: { type: Boolean, default: false },
        remarks: String
    },
    toolCondition: {
        powerToolsSafe: { type: Boolean, default: false },
        handToolsGood: { type: Boolean, default: false },
        maintenanceUpToDate: { type: Boolean, default: false },
        remarks: String
    },
    overallStatus: {
        type: String,
        enum: ['SAFE', 'MINOR_ISSUES', 'MAJOR_ISSUES', 'UNSAFE'],
        required: true
    },
    remarks: {
        type: String,
        default: ''
    },
    photos: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

// Index for quick daily checklist lookup
safetyChecklistSchema.index({ project: 1, date: -1 });

export const SafetyChecklist = mongoose.model('SafetyChecklist', safetyChecklistSchema);

// ========================================
// SAFETY CERTIFICATION
// ========================================

const safetyCertificationSchema = new mongoose.Schema({
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    certificationType: {
        type: String,
        enum: [
            'SAFETY_INDUCTION',
            'WORK_AT_HEIGHT',
            'CONFINED_SPACE',
            'ELECTRICAL_SAFETY',
            'FIRE_SAFETY',
            'FIRST_AID',
            'SCAFFOLDING',
            'CRANE_OPERATION',
            'EXCAVATION_SAFETY',
            'OTHER'
        ],
        required: true
    },
    issueDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    issuingAuthority: {
        type: String,
        required: true,
        trim: true
    },
    certificateUrl: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['VALID', 'EXPIRING_SOON', 'EXPIRED'],
        default: 'VALID'
    },
    toolboxTalks: [{
        topic: String,
        date: Date,
        conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        attendanceProof: String
    }],
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

// Auto-update status based on expiry date
safetyCertificationSchema.pre('save', async function () {
    const today = new Date();
    const daysToExpiry = Math.floor((this.expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysToExpiry < 0) {
        this.status = 'EXPIRED';
    } else if (daysToExpiry <= 30) {
        this.status = 'EXPIRING_SOON';
    } else {
        this.status = 'VALID';
    }
});

// Index for quick worker certification lookup
safetyCertificationSchema.index({ worker: 1, status: 1 });

export const SafetyCertification = mongoose.model('SafetyCertification', safetyCertificationSchema);

// Default export for backward compatibility
export default SafetyIncident;
