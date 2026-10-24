export const BlockSchema = {
  block_state: {        
    sos_count: 0,
    ai_analysis: "",
    safety_metrics: {
      current_score: 10.0,
      mean_sos: 1.0,
      std_dev: 1.0,
      z_score: 0.0,
      weighted_sos_impact: 0.0, // Persisted across RTDB evictions
      last_updated: null
    }
  }
};