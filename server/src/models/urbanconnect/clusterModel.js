import mongoose from "mongoose";

const clusterSchema = new mongoose.Schema(
  {
    clusterId: { type: String, required: true, unique: true },
    headline: { type: String, required: true },
    summary: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Cluster || mongoose.model("Cluster", clusterSchema);
