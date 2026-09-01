export const UserSchema = {
  email: "",
  name: "",
  id: "",

  current_lat: 0,
  current_lng: 0,

  current_geohash_6: "",
  current_geohash_8: "",

  sos_triggered: false,
  sos_triggered_time: null,
  
  // --- TRUST SYSTEM FIELDS ---
  safe_walk_streak: 0,
  false_sos_count: 0,
  trust_score: 5.0,        // CORRECTED: Must start at 5.0 (Neutral)
  is_verified: false,      // ADDED: Determines if they can reach a 10.0 score

  active_blocks: []
};