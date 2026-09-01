import mongoose from "mongoose";

const savedSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        commentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            required: true,
        }
    }, { timestamps: true }
);

savedSchema.index({ userId: 1, commentId: 1 }, { unique: true });
export default mongoose.models.Saved || mongoose.model("Saved", savedSchema);
