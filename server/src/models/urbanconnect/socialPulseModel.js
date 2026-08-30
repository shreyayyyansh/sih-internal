import mongoose from "mongoose";

const extractedIssueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: [
      'WATER_SUPPLY', 'ELECTRICITY', 'ROADS_AND_INFRA', 
      'SANITATION_WASTE', 'PUBLIC_HEALTH', 'TRAFFIC_TRANSPORT', 
      'LAW_AND_ORDER', 'CORRUPTION_BUREAUCRACY', 'OTHER'
    ],
    required: true 
  },
  locations_mentioned: [{ type: String }],
  severity_level: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true 
  },
  complaint_volume: { type: Number, default: 1 },
  source_urls: [{ type: String }]
});

const sentimentMetricsSchema = new mongoose.Schema({
  public_trust_score: { type: Number, required: true },
  primary_emotion: { type: String, required: true },
  top_target_authority: { type: String, default: null }
});

const trendAnalysisSchema = new mongoose.Schema({
  direction: { 
    type: String, 
    enum: ['IMPROVING', 'DECLINING', 'STABLE', 'INSUFFICIENT_DATA'],
    required: true 
  },
  trust_score_delta: { type: Number, default: 0.0 },
  insight: { type: String, required: true }
});

const socialPulseSchema = new mongoose.Schema({
  city: { 
    type: String, 
    required: true,
    index: true // Indexed for fast queries on the dashboard
  },
  executive_summary: { type: String, required: true },
  sentiment_metrics: { type: sentimentMetricsSchema, required: true },
  trend_analysis: { type: trendAnalysisSchema, required: true },
  extracted_issues: [extractedIssueSchema],
  recommended_actions: [{ type: String }],
}, { 
  timestamps: true // Automatically creates 'createdAt' and 'updatedAt'
});

const SocialPulse = mongoose.model("SocialPulse", socialPulseSchema);

export default SocialPulse;