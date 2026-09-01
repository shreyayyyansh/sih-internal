import mongoose from "mongoose";

const administrationSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true, index: true },
    postName: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
  },
  { timestamps: true }
);

administrationSchema.index({ city: 1, postName: 1 }, { unique: true });

export default mongoose.models.Administration || mongoose.model("Administration", administrationSchema);
