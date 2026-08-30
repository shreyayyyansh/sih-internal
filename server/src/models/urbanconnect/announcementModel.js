import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    authority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Administration",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    city: { type: String, required: true, trim: true, index: true },
    department: { type: String, trim: true },
    embedding: { type: [Number], default: [] },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

announcementSchema.index({ city: 1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);
