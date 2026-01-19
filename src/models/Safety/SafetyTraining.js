import mongoose from 'mongoose';

const safetyTrainingSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration', required: true },
    workerName: { type: String, required: true }, // Could simply be a string or linked to a Worker model if exists
    workerId: String, // Optional ID
    type: { type: String, enum: ['Induction', 'FireSafety', 'HeightWork', 'Electrical', 'FirstAid'], required: true },
    trainingDate: { type: Date, required: true },
    expiryDate: { type: Date }, // Some trainings expire
    trainerName: String,
    status: { type: String, enum: ['Valid', 'Expired', 'Revoked'], default: 'Valid' },
    certificateUrl: String,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('SafetyTraining', safetyTrainingSchema);
