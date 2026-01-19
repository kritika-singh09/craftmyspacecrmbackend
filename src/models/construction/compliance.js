import mongoose from 'mongoose';

// ========================================
// COMPLIANCE TRACKER
// ========================================

const complianceTrackerSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    complianceType: {
        type: String,
        enum: ['LABOR_LAW', 'FIRE_NOC', 'ENVIRONMENTAL_CLEARANCE', 'SITE_PERMIT', 'INSURANCE', 'BUILDING_PERMIT', 'OTHER'],
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
    documentUrl: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_RENEWAL'],
        default: 'VALID'
    },
    renewalReminder: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        default: ''
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

// Auto-update status and reminder based on expiry
complianceTrackerSchema.pre('save', async function () {
    const today = new Date();
    const daysToExpiry = Math.floor((this.expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysToExpiry < 0) {
        this.status = 'EXPIRED';
    } else if (daysToExpiry <= 60) {
        this.status = 'EXPIRING_SOON';
        this.renewalReminder = true;
    } else {
        this.status = 'VALID';
        this.renewalReminder = false;
    }
});

export const ComplianceTracker = mongoose.model('ComplianceTracker', complianceTrackerSchema);

// ========================================
// RISK SCORE
// ========================================

const riskScoreSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        unique: true
    },
    safetyMetrics: {
        incidentCount: { type: Number, default: 0 },
        criticalIncidents: { type: Number, default: 0 },
        daysWithoutIncident: { type: Number, default: 0 }
    },
    qualityMetrics: {
        defectCount: { type: Number, default: 0 },
        failedInspections: { type: Number, default: 0 },
        reworkCost: { type: Number, default: 0 }
    },
    complianceMetrics: {
        expiredDocuments: { type: Number, default: 0 },
        pendingRenewals: { type: Number, default: 0 }
    },
    riskScore: {
        type: Number,
        default: 0,
        min: 0
    },
    riskLevel: {
        type: String,
        enum: ['GREEN', 'AMBER', 'RED'],
        default: 'GREEN'
    },
    calculatedAt: {
        type: Date,
        default: Date.now
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

// Calculate risk score based on metrics
riskScoreSchema.methods.calculateRiskScore = function () {
    const { incidentCount, criticalIncidents } = this.safetyMetrics;
    const { defectCount, failedInspections } = this.qualityMetrics;
    const { expiredDocuments, pendingRenewals } = this.complianceMetrics;

    // Weighted formula
    const safetyScore = (incidentCount * 2) + (criticalIncidents * 5);
    const qualityScore = (defectCount * 1.5) + (failedInspections * 3);
    const complianceScore = (expiredDocuments * 4) + (pendingRenewals * 2);

    this.riskScore = safetyScore + qualityScore + complianceScore;

    // Determine risk level
    if (this.riskScore < 10) {
        this.riskLevel = 'GREEN';
    } else if (this.riskScore < 20) {
        this.riskLevel = 'AMBER';
    } else {
        this.riskLevel = 'RED';
    }

    this.calculatedAt = new Date();
    return this.riskScore;
};

export const RiskScore = mongoose.model('RiskScore', riskScoreSchema);

// Default export for backward compatibility
export default ComplianceTracker;
