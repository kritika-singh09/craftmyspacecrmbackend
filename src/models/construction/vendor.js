import mongoose from 'mongoose';

// ========================================
// VENDOR PROFILE
// ========================================

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vendor name is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['MATERIAL', 'SERVICE', 'EQUIPMENT', 'SUBCONTRACTOR'],
        required: true
    },
    // 🌍 UNIVERSAL DOMAIN MAPPING
    domains: [{
        type: String,
        enum: ['CONSTRUCTION', 'ARCHITECTURE', 'INTERIOR'],
        required: true
    }],
    specializations: [{
        type: String, // e.g., 'Cement', 'Furniture', 'Glass'
        trim: true
    }],
    contactPerson: {
        name: String,
        phone: String,
        email: String
    },
    gstNumber: {
        type: String,
        trim: true,
        uppercase: true
    },
    panNumber: {
        type: String,
        trim: true,
        uppercase: true
    },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        branch: String
    },
    operatingRegions: [{
        type: String,
        trim: true
    }],
    deliveryCapacity: {
        type: Number,
        default: 0
    },
    avgLeadTimeDays: {
        type: Number,
        default: 7
    },
    performanceScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    riskLevel: {
        type: String,
        enum: ['GREEN', 'AMBER', 'RED'],
        default: 'GREEN'
    },
    complianceDocs: [{
        docType: {
            type: String,
            enum: ['ISO_CERT', 'INSURANCE', 'TEST_REPORT', 'ENVIRONMENTAL', 'OTHER']
        },
        docName: String,
        docUrl: String,
        issueDate: Date,
        expiryDate: Date,
        status: {
            type: String,
            enum: ['VALID', 'EXPIRING_SOON', 'EXPIRED'],
            default: 'VALID'
        }
    }],
    contractDetails: {
        hasRateContract: { type: Boolean, default: false },
        contractStartDate: Date,
        contractEndDate: Date,
        slaDeliveryDays: Number,
        penaltyClause: String,
        escalationRule: String
    },
    financialInfo: {
        creditLimit: { type: Number, default: 0 },
        outstandingPayables: { type: Number, default: 0 },
        paymentTerms: String,
        advancePaid: { type: Number, default: 0 }
    },
    isBlacklisted: {
        type: Boolean,
        default: false
    },
    blacklistReason: {
        type: String,
        default: ''
    },
    blacklistDate: {
        type: Date
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

vendorSchema.pre('save', async function () {
    if (this.complianceDocs && this.complianceDocs.length > 0) {
        const today = new Date();
        this.complianceDocs.forEach(doc => {
            if (doc.expiryDate) {
                const daysToExpiry = Math.floor((doc.expiryDate - today) / (1000 * 60 * 60 * 24));
                if (daysToExpiry < 0) {
                    doc.status = 'EXPIRED';
                } else if (daysToExpiry <= 30) {
                    doc.status = 'EXPIRING_SOON';
                } else {
                    doc.status = 'VALID';
                }
            }
        });
    }
});

vendorSchema.methods.updateRating = function () {
    this.rating = Math.round((this.performanceScore / 100) * 5 * 10) / 10;
};

export const Vendor = mongoose.model('Vendor', vendorSchema);

// ========================================
// VENDOR PERFORMANCE
// ========================================

const vendorPerformanceSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    month: {
        type: Date,
        required: true
    },
    metrics: {
        onTimeDeliveryRate: { type: Number, default: 0, min: 0, max: 100 },
        qualityPassRate: { type: Number, default: 0, min: 0, max: 100 },
        priceCompetitiveness: { type: Number, default: 0, min: 0, max: 100 },
        responsivenessScore: { type: Number, default: 0, min: 0, max: 100 },
        disputeCount: { type: Number, default: 0 }
    },
    overallScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    }
}, {
    timestamps: true
});

vendorPerformanceSchema.methods.calculateOverallScore = function () {
    const { onTimeDeliveryRate, qualityPassRate, priceCompetitiveness, responsivenessScore, disputeCount } = this.metrics;
    const disputeScore = Math.max(0, 100 - (disputeCount * 10));

    this.overallScore = (
        (onTimeDeliveryRate * 0.30) +
        (qualityPassRate * 0.30) +
        (priceCompetitiveness * 0.20) +
        (responsivenessScore * 0.10) +
        (disputeScore * 0.10)
    );

    return this.overallScore;
};

vendorPerformanceSchema.index({ vendor: 1, month: -1 });

export const VendorPerformance = mongoose.model('VendorPerformance', vendorPerformanceSchema);

// ========================================
// RATE HISTORY
// ========================================

const rateHistorySchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    materialMaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialMaster',
        required: true
    },
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    effectiveDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    contractedRate: {
        type: Boolean,
        default: false
    },
    marketRate: {
        type: Number,
        default: 0
    },
    priceFluctuation: {
        type: Number,
        default: 0
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

rateHistorySchema.pre('save', async function () {
    if (this.isNew) {
        const previousRate = await this.constructor.findOne({
            vendor: this.vendor,
            materialMaster: this.materialMaster,
            company: this.company,
            effectiveDate: { $lt: this.effectiveDate }
        }).sort({ effectiveDate: -1 });

        if (previousRate) {
            this.priceFluctuation = ((this.rate - previousRate.rate) / previousRate.rate) * 100;
        }
    }
});

rateHistorySchema.index({ vendor: 1, materialMaster: 1, effectiveDate: -1 });

export const RateHistory = mongoose.model('RateHistory', rateHistorySchema);

// ========================================
// PURCHASE ORDER
// ========================================

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        unique: true,
        required: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    items: [{
        materialMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialMaster', required: true },
        quantity: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 }
    }],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    gst: {
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
        totalGst: { type: Number, default: 0 }
    },
    grandTotal: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'IN_TRANSIT', 'DELIVERED', 'QC_PASSED', 'CLOSED', 'CANCELLED'],
        default: 'DRAFT'
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    approvals: [{
        level: Number,
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
        comments: String,
        approvedAt: Date
    }],
    expectedDeliveryDate: {
        type: Date,
        required: true
    },
    actualDeliveryDate: {
        type: Date
    },
    partialDeliveries: [{
        deliveryDate: Date,
        items: [{
            materialMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialMaster' },
            quantityDelivered: Number
        }],
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        note: String
    }],
    deliveryStatus: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'COMPLETE'],
        default: 'PENDING'
    },
    financial: {
        advancePaid: { type: Number, default: 0 },
        balancePayable: { type: Number, default: 0 },
        retentionAmount: { type: Number, default: 0 },
        retentionPercentage: { type: Number, default: 0 },
        invoiceNumber: String,
        invoiceUrl: String,
        paymentStatus: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' }
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

// Timeline and financial logic can stay if needed, but poNumber is now in controller
purchaseOrderSchema.pre('validate', async function () {
    if (this.financial) {
        this.financial.balancePayable = this.grandTotal - this.financial.advancePaid - this.financial.retentionAmount;
    }
});

purchaseOrderSchema.index({ vendor: 1, status: 1, createdAt: -1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

// Default export for backward compatibility
export default Vendor;
