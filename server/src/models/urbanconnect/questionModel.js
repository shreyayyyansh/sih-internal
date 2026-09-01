import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  image:{type:[String],default:[]},
  tags: [{ type: String }],
  taggedAuthorities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Administration" }],
  isAnswered: { type: Boolean, default: false },
  votes: { type: Number, default: 0 },

  // Civic Syndication Fields
  isCivicReport: { type: Boolean, default: false },
  reportId: { type: String, default: null },
  reportCategory: { type: String, default: null },
  reportStatus: { type: String, enum: ['PENDING', 'ASSIGNED', 'USERVERIFICATION', 'RESOLVED'], default: 'PENDING' },
  geohash: { type: String, default: null },

  // AI Analysis Fields (populated by fire-and-forget agent)
  aiAnalysis: {
    sentiment: { type: String, enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ALARMING'], default: null },
    sentimentScore: { type: Number, default: null },
    urgency: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: null },
    postType: { type: String, enum: ['CIVIC_REPORT', 'POLICY_RUMOR', 'GENERAL'], default: null },
    isMisinformation: { type: Boolean, default: null },
    contextNote: { type: String, default: null },
    clusterId: { type: String, default: null },
    analyzedAt: { type: Date, default: null },
  },
  embedding: { type: [Number], default: null },
}
,{ timestamps: true }
);
questionSchema.index({ author: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ votes: -1 });
export default mongoose.models.Question || mongoose.model("Question", questionSchema);
