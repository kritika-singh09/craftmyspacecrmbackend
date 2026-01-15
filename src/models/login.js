import mongoose from "mongoose";

const loginSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userregistration"
        },

        email: String,

        role: String,

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "companyregistration"
        },

        ipAddress: String,

        userAgent: String,

        loginAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

export default mongoose.model("login", loginSchema);
