import mongoose from 'mongoose';

const paymentRequestSchema = new mongoose.Schema({
    requestId: {
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
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    purpose: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Material', 'Labor', 'Machinery', 'Contractor', 'Other'],
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration'
    },
    releasedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration'
    },
    status: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'RELEASED', 'SETTLED', 'REJECTED'],
        default: 'PENDING'
    },
    advance: {
        advancePaid: { type: Number, default: 0 },
        adjustedAmount: { type: Number, default: 0 },
        balance: { type: Number, default: 0 }
    },
    retention: {
        percentage: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        releaseCondition: String,
        releaseDate: Date
    },
    invoiceDetails: {
        invoiceNumber: String,
        invoiceDate: Date,
        invoiceUrl: String
    },
    paymentDetails: {
        mode: String,
        referenceId: String,
        paidDate: Date
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

// Auto-generate request ID
paymentRequestSchema.pre('save', async function () {
    if (!this.requestId) {
        const count = await this.constructor.countDocuments();
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        this.requestId = `PAY-${year}${month}-${(count + 1).toString().padStart(5, '0')}`;
    }
});

export default mongoose.model('PaymentRequest', paymentRequestSchema);
