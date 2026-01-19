import mongoose from 'mongoose';

const ppeItemSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration', required: true },
    name: { type: String, required: true }, // e.g., Helmet, Gloves
    description: { type: String },
    totalQuantity: { type: Number, default: 0 },
    issuedQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    unitPrice: { type: Number, default: 0 }, // For damage deduction
    lastRestocked: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Middleware to update available quantity
ppeItemSchema.pre('save', async function () {
    this.availableQuantity = this.totalQuantity - this.issuedQuantity;
});

export default mongoose.model('PPEItem', ppeItemSchema);
