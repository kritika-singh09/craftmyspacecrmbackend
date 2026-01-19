import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    // 1️⃣ Basic Identity (MANDATORY)
    type: {
        type: String,
        enum: ['Individual', 'Company', 'Government', 'Trust'],
        required: true,
        default: 'Company'
    },
    name: {
        type: String,
        required: [true, 'Client/Company Name is required'],
        trim: true,
        index: true
    },
    authorizedContact: {
        type: String,
        required: [true, 'Authorized Contact Person is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email ID is required'],
        trim: true,
        lowercase: true
    },
    address: {
        registered: { type: String, required: true },
        site: { type: String } // Optional if same as registered
    },

    // 2️⃣ Legal & Compliance Info
    legal: {
        pan: { type: String, uppercase: true, trim: true },
        gst: { type: String, uppercase: true, trim: true },
        cin: { type: String, uppercase: true, trim: true }, // For companies
        billingAddress: { type: String },
        kycStatus: {
            type: String,
            enum: ['Pending', 'Verified', 'Rejected'],
            default: 'Pending'
        },
        documents: {
            panCard: String, // URL
            gstCertificate: String, // URL
            agreement: String // URL
        }
    },

    // 3️⃣ Contract & Agreement Details
    contract: {
        type: {
            type: String,
            enum: ['Fixed Cost', 'Item Rate', 'Turnkey', 'Cost + Margin'],
            default: 'Item Rate'
        },
        value: { type: Number, default: 0 },
        startDate: { type: Date },
        endDate: { type: Date },
        retentionPercentage: { type: Number, default: 5 }, // e.g. 5%
        defectLiabilityPeriod: { type: String, default: '12 Months' },
        paymentTerms: { type: String, default: '30 Days' }, // e.g. "Net 30"
        files: {
            signedAgreement: String, // URL
            workOrder: String // URL
        }
    },

    // 4️⃣ Project Association (CORE)
    // Projects will be linked via virtuals or manual population in controller

    // 5️⃣ Financial Profile
    financial: {
        creditLimit: { type: Number, default: 0 },
        openingBalance: { type: Number, default: 0 },
        outstandingAmount: { type: Number, default: 0 },
        advanceReceived: { type: Number, default: 0 },
        retentionHeld: { type: Number, default: 0 }
    },

    // 6️⃣ Communication & Approval Matrix
    communication: {
        approvers: {
            clientSide: { type: String },
            designAuthority: { type: String },
            paymentAuthority: { type: String }
        },
        preferredMode: {
            type: String,
            enum: ['Email', 'WhatsApp', 'Portal'],
            default: 'Email'
        }
    },

    // 7️⃣ Site & Coordination Info
    site: {
        inCharge: { type: String },
        securityContact: { type: String },
        workingHours: { type: String, default: '9 AM - 6 PM' },
        entryRules: { type: String }
    },

    // 8️⃣ Risk & Behaviour Profile (Internal)
    riskProfile: {
        paymentBehaviour: {
            type: String,
            enum: ['Good', 'Average', 'Delayed'],
            default: 'Good'
        },
        legalHistory: { type: String },
        riskTag: {
            type: String,
            enum: ['Normal', 'High Risk', 'VIP'],
            default: 'Normal'
        },
        remarks: { type: String } // Internal notes
    },

    // 9️⃣ Meta
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for linked projects
clientSchema.virtual('projects', {
    ref: 'Project',
    localField: '_id',
    foreignField: 'client_id', // Note: Need to ensure Project model has client_id ref if we want this to work automatically, or we query separately
    justOne: false
});

export default mongoose.model('Client', clientSchema);
