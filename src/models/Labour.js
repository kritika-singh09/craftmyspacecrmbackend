import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    totalEarnings: { type: Number, required: true },
    advancesDeducted: { type: Number, required: true },
    netPaid: { type: Number, required: true },
    notes: String
});

const attendanceSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    status: { type: String, enum: ['P', 'A', 'L', 'HD', 'Late'], default: 'P' },
    lateFee: { type: Number, default: 0 },
    paid: { type: Boolean, default: false }
});

const advanceSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    reason: String,
    settled: { type: Boolean, default: false }
});

const labourSchema = new mongoose.Schema({
    labourId: { type: String, unique: true },
    aadharNumber: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: String,
    photo: String,
    category: {
        type: String,
        enum: [
            'Helper / Mazdoor',
            'Mason (Mistri)',
            'Electrician',
            'Plumber',
            'Carpenter',
            'Painter',
            'Tile Layer',
            'Bar Bender',
            'Supervisor (Site)'
        ],
        required: true
    },
    dailyWage: { type: Number, default: 0 },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    isActive: { type: Boolean, default: true },
    attendance: [attendanceSchema],
    advances: [advanceSchema],
    settlements: [settlementSchema],
    pendingDues: { type: Number, default: 0 }
}, { timestamps: true });

// Auto-generate labourId if not provided - using pre('validate') to ensure it exists before required check
labourSchema.pre('validate', async function () {
    if (!this.labourId) {
        const count = await this.constructor.countDocuments();
        this.labourId = `LAB${String(count + 1).padStart(4, '0')}`;
    }
});

const Labour = mongoose.model('Labour', labourSchema);

export default Labour;
