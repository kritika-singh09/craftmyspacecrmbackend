import mongoose from 'mongoose';

const safetyPolicySchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration', required: true },
    title: { type: String, required: true },
    description: { type: String },
    category: {
        type: String,
        enum: ['General', 'Construction', 'Interior', 'Architecture', 'Electrical', 'Fire', 'HeightWork'],
        default: 'General'
    },
    mandatory: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('SafetyPolicy', safetyPolicySchema);
