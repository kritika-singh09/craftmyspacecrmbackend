import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    client: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true
    },
    budget: {
        type: Number,
        required: [true, 'Budget is required']
    },
    approvedBudget: {
        type: Number,
        default: function () { return this.budget; }
    },
    revisedBudget: {
        type: Number,
        default: 0
    },
    contingencyFund: {
        type: Number,
        default: function () { return this.budget * 0.05; } // 5% default
    },
    lockedAmount: {
        type: Number,
        default: 0 // Committed but not yet paid
    },
    actualSpend: {
        type: Number,
        default: 0
    },
    start_date: {
        type: Date,
        required: [true, 'Start date is required']
    },
    end_date: {
        type: Date,
        required: [true, 'End date is required']
    },
    status: {
        type: String,
        enum: ['Planning', 'In Progress', 'Ongoing', 'On Hold', 'Completed', 'Cancelled'],
        default: 'Planning'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'companyregistration',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration',
        required: true
    },
    projectCode: {
        type: String,
        unique: true,
        sparse: true // Allow nulls for existing projects until updated
    },
    projectLead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userregistration'
    },
    description: {
        type: String,
        trim: true
    },
    // modules: {
    //     architecture: {
    //         enabled: { type: Boolean, default: false },
    //         status: { type: String, enum: ['LOCKED', 'ONGOING', 'COMPLETED'], default: 'LOCKED' }
    //     },
    //     interior: {
    //         enabled: { type: Boolean, default: false },
    //         status: { type: String, enum: ['LOCKED', 'ONGOING', 'COMPLETED'], default: 'LOCKED' }
    //     },
    //     construction: {
    //         enabled: { type: Boolean, default: false },
    //         status: { type: String, enum: ['LOCKED', 'ONGOING', 'COMPLETED'], default: 'LOCKED' }
    //     }
    // },
    teamMembers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'userregistration' },
        role: String
    }],
    statusHistory: [{
        status: String,
        date: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

export default mongoose.model('Project', projectSchema);
