import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    type: {
        type: String,
        enum: ['INCOME', 'EXPENSE'],
        required: true
    },
    category: {
        type: String,
        enum: ['Material', 'Labor', 'Machinery', 'Overheads', 'Compliance', 'Revenue', 'Payroll', 'Consultancy'],
        required: true
    },
    businessVertical: {
        type: String,
        enum: ['CONSTRUCTION', 'ARCHITECTURE', 'INTERIOR'],
        required: true,
        default: 'CONSTRUCTION'
    },
    coaAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'COA'
    },
    ledgerDate: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    boqItem: {
        type: String,
        trim: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    materialRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialRequest' // Auto-linked when material is issued
    },
    gst: {
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
        totalGst: { type: Number, default: 0 },
        vendorGstin: String
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Bank', 'UPI', 'Cheque', 'NEFT', 'RTGS'],
        default: 'Bank'
    },
    referenceId: {
        type: String, // Invoice number, UTR, Cheque number
        trim: true
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'SETTLED', 'CANCELLED'],
        default: 'PENDING'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration'
    },
    description: {
        type: String,
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

// Auto-generate transaction ID
transactionSchema.pre('save', async function () {
    if (!this.transactionId) {
        const count = await this.constructor.countDocuments();
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const prefix = this.type === 'INCOME' ? 'INC' : 'EXP';
        this.transactionId = `${prefix}-${year}${month}-${(count + 1).toString().padStart(5, '0')}`;
    }
});

export default mongoose.model('Transaction', transactionSchema);
