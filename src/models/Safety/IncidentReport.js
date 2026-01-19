import mongoose from 'mongoose';

const incidentReportSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration', required: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['Injury', 'NearMiss', 'PropertyDamage', 'Violation', 'Fire', 'Other'], required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'Critical'], required: true }, // Critical = Work Stop
    description: { type: String, required: true },
    photos: [String],
    immediateActionTaken: String,
    status: { type: String, enum: ['Open', 'Investigating', 'Resolved', 'Closed'], default: 'Open' },
    investigationNotes: String,
    workStopped: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRegistration' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('IncidentReport', incidentReportSchema);
