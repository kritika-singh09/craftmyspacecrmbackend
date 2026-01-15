import mongoose from "mongoose";

// Delete the model if it exists to avoid caching issues
if (mongoose.models.companyregistration) {
    delete mongoose.models.companyregistration;
}

const companyRegistrationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        ownerName: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        phone: String,

        gstNumber: String,

        address: String,

        companyTypes: [String],

        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active"
        },

        plan: {
            type: String,
            default: "FREE"
        }
    },
    { timestamps: true }
);

// Add validation after schema creation
companyRegistrationSchema.path('companyTypes').validate(function (value) {
    const validTypes = ["CONSTRUCTION_COMPANY", "INTERIOR_DESIGN_COMPANY", "ARCHITECT_DESIGN_COMPANY"];
    return value && value.length > 0 && value.every(type => validTypes.includes(type));
}, 'Invalid company type(s). Valid types are: CONSTRUCTION_COMPANY, INTERIOR_DESIGN_COMPANY, ARCHITECT_DESIGN_COMPANY');

export default mongoose.model("companyregistration", companyRegistrationSchema);
