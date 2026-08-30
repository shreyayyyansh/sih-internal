import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        commentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            required: false,
        },
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: false,
        },
        value: {
            type: Number,
            enum: [-1, 1],
            required: true,
        }
    },
    { timestamps: true }
);

// Unique index: one vote per user per comment OR per question
voteSchema.index({ userId: 1, commentId: 1 }, { unique: true, sparse: true });
voteSchema.index({ userId: 1, questionId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Vote || mongoose.model("Vote", voteSchema);
