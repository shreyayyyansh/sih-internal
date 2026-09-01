import mongoose from "mongoose";

const questionVoteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: true,
        },
        value: {
            type: Number,
            enum: [-1, 1],
            required: true,
        }
    },
    { timestamps: true }
);

questionVoteSchema.index({ userId: 1, questionId: 1 }, { unique: true });

export default mongoose.models.QuestionVote || mongoose.model("QuestionVote", questionVoteSchema);
