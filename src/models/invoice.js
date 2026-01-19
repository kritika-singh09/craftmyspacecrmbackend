import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        unique: true
    },
    client: {
        type: String, // Can be ref if Client model is unified
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
    taxAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'],
        default: 'DRAFT'
    },
    dueDate: {
        type: Date
    },
    issuedDate: {
        type: Date,
        default: Date.now
    },
    businessVertical: {
        type: String,
        enum: ['CONSTRUCTION', 'ARCHITECTURE', 'INTERIOR'],
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    },
    items: [{
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number
    }],
    notes: String,
    attachments: [{
        fileName: String,
        fileUrl: String
    }]
}, {
    timestamps: true
});

// Auto-generate invoice number if not provided
invoiceSchema.pre('save', async function () {
    if (!this.invoiceNumber) {
        const count = await this.constructor.countDocuments();
        const year = new Date().getFullYear();
        this.invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(5, '0')}`;
    }
});

export default mongoose.model('Invoice', invoiceSchema);
