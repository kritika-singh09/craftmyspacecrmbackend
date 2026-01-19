import mongoose from 'mongoose';

const coaSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Account code is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
        required: [true, 'Account type is required']
    },
    description: {
        type: String,
        trim: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create index for code + company uniqueness if multiple companies share the DB
coaSchema.index({ code: 1, company: 1 }, { unique: true });

export default mongoose.model('COA', coaSchema);
