import mongoose from 'mongoose';

const contractorSchema = new mongoose.Schema({
    // 1️⃣ Basic Details
    type: {
        type: String,
        enum: ['Labour Contractor', 'Subcontractor', 'Specialist'],
        required: true,
        default: 'Labour Contractor'
    },
    specialization: {
        type: String,
        enum: ['RCC', 'Brickwork', 'Electrical', 'Plumbing', 'HVAC', 'Painting', 'Interior Finishing', 'General'],
        default: 'General'
    },
    name: {
        type: String,
        required: [true, 'Contractor/Firm Name is required'],
        trim: true,
        index: true
    },
    contactPerson: {
        type: String,
        required: [true, 'Contact Person is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        required: true
    },

    // 2️⃣ Legal & Compliance
    legal: {
        pan: { type: String, uppercase: true, trim: true },
        gst: { type: String, uppercase: true, trim: true },
        licenseNumber: { type: String, trim: true }, // Labour License
        bankDetails: {
            accountNumber: { type: String },
            ifsc: { type: String, uppercase: true },
            bankName: { type: String }
        },
        kycStatus: {
            type: String,
            enum: ['Pending', 'Verified', 'Rejected'],
            default: 'Pending'
        },
        documents: {
            panCard: String,
            gstCertificate: String,
            labourLicense: String,
            agreement: String
        }
    },

    // 3️⃣ Skills & Experience
    skills: {
        level: {
            type: String,
            enum: ['Basic', 'Intermediate', 'Expert'],
            default: 'Basic'
        },
        experienceYears: { type: Number, default: 0 },
        standardRates: { type: String }, // e.g., "Brickwork: 25/sqft" (Text for now, or could be a map)
        status: {
            type: String,
            enum: ['Active', 'Inactive', 'Blacklisted'],
            default: 'Active'
        }
    },

    // 4️⃣ Work Orders & Projects (Array of Assignments)
    workOrders: [{
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Link to Project
        projectName: String, // Cached for easier display
        workOrderNumber: String,
        scopeOfWork: String,
        contractValue: Number,
        startDate: Date,
        endDate: Date,
        paymentType: {
            type: String,
            enum: ['Item Rate', 'Lump Sum', 'Labour Rate'],
            default: 'Labour Rate'
        },
        status: {
            type: String,
            enum: ['Active', 'Completed', 'Terminated'],
            default: 'Active'
        },
        retentionPercentage: { type: Number, default: 5 },
        advancePaid: { type: Number, default: 0 },
        completionPercentage: { type: Number, default: 0 }
    }],

    // 🔟 Performance & Compliance
    compliance: {
        safetyTraining: { type: Boolean, default: false },
        ppeCompliant: { type: Boolean, default: false },
        rating: { type: Number, min: 1, max: 5, default: 3 }, // 1-5 Stars
        qualityIssues: { type: Number, default: 0 }, // Count of NCRs
        penaltyApplied: { type: Number, default: 0 } // Total penalty amount
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

export default mongoose.model('Contractor', contractorSchema);
