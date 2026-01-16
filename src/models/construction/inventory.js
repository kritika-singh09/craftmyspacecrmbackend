import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
    materialMaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialMaster',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project' // Optional: for project-specific stores
    },
    totalStock: {
        type: Number,
        default: 0
    },
    availableStock: {
        type: Number,
        default: 0
    },
    reservedStock: {
        type: Number,
        default: 0
    },
    damagedStock: {
        type: Number,
        default: 0
    },
    wastage: {
        type: Number,
        default: 0
    },
    reorderLevel: {
        type: Number,
        default: 0
    },
    minOrderQty: {
        type: Number,
        default: 0
    },
    preferredVendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    batchInfo: [{
        batchNumber: String,
        mfgDate: Date,
        expiryDate: Date,
        quantity: Number,
        testReportUrl: String
    }],
    lastAuditDate: {
        type: Date
    },
    timeline: [{
        action: String,
        quantity: Number,
        date: { type: Date, default: Date.now },
        performedBy: String,
        relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
    }]
}, {
    timestamps: true
});

export default mongoose.model('Inventory', inventorySchema);
