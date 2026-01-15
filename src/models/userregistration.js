import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userRegistrationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: [
                "SUPER_ADMIN",
                "COMPANY_ADMIN",
                "ENGINEER",
                "ACCOUNTANT",
                "SUPERVISOR",
                "CONTRACTOR"
            ],
            required: true
        },

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "companyregistration"
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// hash password
userRegistrationSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw new Error('Password hashing failed: ' + err.message);
    }
});

// compare password
userRegistrationSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

export default mongoose.model("userregistration", userRegistrationSchema);
