import mongoose from 'mongoose';

const safetyChecklistSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration', required: true }, // Site Engineer
    date: { type: Date, default: Date.now },
    module: { type: String, enum: ['Construction', 'Interior', 'Architecture'], required: true },
    items: [{
        question: String,
        status: { type: String, enum: ['Safe', 'Unsafe', 'NA'], required: true },
        remarks: String,
        photoUrl: String // For proof or violation
    }],
    locationStr: String, // GPS Coordinates if available
    photos: [String], // General photos for the report
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration' },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('SafetyChecklist', safetyChecklistSchema);
