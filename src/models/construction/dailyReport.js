import mongoose from 'mongoose';

const dailyReportSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    reportDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    // 1️⃣ Auto Project & Site Meta
    siteMeta: {
        site: String,
        block: String,
        floor: String,
        subSite: String // e.g., Basement, Roof, Wing A
    },
    // 2️⃣ Weather & Conditions
    weather: {
        temperature: Number,
        humidity: Number,
        rainStatus: String,
        wind: String,
        notes: String
    },
    workDescription: {
        type: String,
        required: [true, 'Work description is required']
    },
    // 4️⃣ Sub-Task / Activity Breakdown
    activities: [{
        taskName: String,
        startTime: String,
        endTime: String,
        assignedCrew: Number, // Count or refined to array of users later
        qtyDone: Number,
        unit: String,
        progressPercent: { type: Number, default: 0 }
    }],
    // 5️⃣ Safety Checks / Incidents
    safety: {
        ppeCompliance: { type: Boolean, default: true },
        gearInspection: { type: Boolean, default: true },
        hazardsObserved: String,
        incidents: String,
        safetyChecklist: [String]
    },
    // 6️⃣ Attendance Management (Smart)
    attendance: {
        totalWorkers: Number,
        present: Number,
        shiftType: { type: String, enum: ['Morning', 'Evening', 'Night'], default: 'Morning' },
        lateReporting: [String],
        notes: String
    },
    // 7️⃣ Resource Usage Tracker
    resourceUsage: {
        materials: [{
            name: String,
            qty: Number,
            unit: String
        }],
        equipment: [{
            name: String,
            hoursUsed: Number
        }],
        fuel: [{
            type: { type: String },
            qty: Number,
            unit: String
        }]
    },
    // 9️⃣ Approvals Workflow (Inline)
    approvals: {
        supervisor: {
            status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
            date: Date,
            comments: String
        },
        projectManager: {
            status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
            date: Date,
            comments: String
        },
        client: {
            status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
            date: Date,
            comments: String
        }
    },
    // 3️⃣ Geo-Tagged Photos & Videos & 🔟 Attachments
    media: [{
        url: String,
        type: { type: String, enum: ['Photo', 'Video', 'Document'] },
        location: {
            lat: Number,
            lng: Number,
            address: String
        },
        timestamp: { type: Date, default: Date.now },
        uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        workItemMark: String // e.g., "Column casted"
    }],
    issues: {
        type: String
    },
    // 8️⃣ Real-time Comments & Collaboration
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

export default mongoose.model('DailyReport', dailyReportSchema);
