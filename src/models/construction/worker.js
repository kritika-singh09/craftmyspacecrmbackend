import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        // required: true, // Pending tenant implementation
    },
    workerId: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['Site', 'Office'],
        required: true
    },
    category: {
        type: String,
        enum: ['Client', 'Staff', 'Worker', 'Investor', 'Vendor'],
        required: true
    },
    vendorSubType: {
        type: String,
        enum: ['Material Supplier', 'Labour Contractor', 'Equipment Supplier', 'Contractor', 'Other Vendor'],
        required: function () { return this.category === 'Vendor'; }
    },
    personalDetails: {
        name: { type: String, required: true },
        mobile: { type: String, required: true },
        email: { type: String },
        dateOfJoining: { type: Date },
        address: { type: String },
        aadharNumber: { type: String },
        panNumber: { type: String }
    },
    officeDetails: {
        designation: String,
        department: String,
        employeeId: String,
        emergencyContact: String
    },
    bankDetails: {
        accountHolderName: String,
        accountNumber: String,
        bankName: String,
        ifscCode: String,
        branchName: String
    },
    dailyWage: { type: Number, default: 0 },
    pendingDues: { type: Number, default: 0 },
    documents: [{
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    attendance: [{
        date: { type: Date, required: true },
        status: {
            type: String,
            enum: ['P', 'A', 'HD', 'L', 'Late'],
            required: true
        },
        lateFee: { type: Number, default: 0 },
        paid: { type: Boolean, default: false }
    }],
    advances: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        reason: String,
        settled: { type: Boolean, default: false }
    }],
    settlements: [{
        date: { type: Date, default: Date.now },
        totalEarnings: Number,
        totalDeductions: Number,
        netAmount: Number,
        notes: String
    }]
}, {
    timestamps: true
});

export const Worker = mongoose.model('Worker', workerSchema);
