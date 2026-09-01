/**
 * trustScoreManager.js
 * Pure math utilities for the trust score lifecycle and block safety impact system.
 * No external dependencies — safe to import anywhere.
 */

const TRUST_MIN = 1.0;
const TRUST_MAX_NORMAL = 7.5;
const TRUST_MAX_VERIFIED = 10.0;
const SAFE_WALK_STREAK_THRESHOLD = 5;
const SAFE_WALK_BONUS = 0.5;
const FALSE_ALARM_DECAY = 0.4;
const REAL_EMERGENCY_BOOST = 1.0;
const BLOCK_IMPACT_SCALE = 0.05; // Controls the Reverse Gaussian decay rate
// Progressive score examples (trust_score=5 per event):
//   1 SOS  → impact=5,  score ≈ 7.8
//   3 SOS  → impact=15, score ≈ 4.7
//   6 SOS  → impact=30, score ≈ 2.2
//   10 SOS → impact=50, score ≈ 1.1 → nearing floor

// ─────────────────────────────────────────────
// System 1: Trust Score Lifecycle
// ─────────────────────────────────────────────

/**
 * Applies exponential decay penalty for a false alarm.
 * trust_score × e^(-0.4), floored at 1.0
 * @param {number} trustScore
 * @returns {{ newTrustScore: number, newStreak: number, newFalseCount: number }}
 */
export const applyFalseAlarmPenalty = (trustScore, falseSOSCount) => {
  const decayed = trustScore * Math.exp(-FALSE_ALARM_DECAY);
  return {
    newTrustScore: Math.max(TRUST_MIN, parseFloat(decayed.toFixed(2))),
    newStreak: 0, // streak always resets on false alarm
    newFalseCount: (falseSOSCount || 0) + 1,
  };
};

/**
 * Applies trust boost for a confirmed real emergency.
 * Always caps at 10.0 regardless of verification.
 * @param {number} trustScore
 * @returns {{ newTrustScore: number }}
 */
export const applyRealEmergencyBoost = (trustScore) => {
  return {
    newTrustScore: Math.min(TRUST_MAX_VERIFIED, parseFloat((trustScore + REAL_EMERGENCY_BOOST).toFixed(2))),
  };
};

/**
 * Increments safe_walk_streak and applies a bonus if threshold reached.
 * Bonus caps at 7.5 for unverified users, 10.0 for verified.
 * @param {number} trustScore
 * @param {number} streak
 * @param {boolean} isVerified
 * @returns {{ newTrustScore: number, newStreak: number }}
 */
export const applySafeWalkStreakBonus = (trustScore, streak, isVerified) => {
  const newStreak = (streak || 0) + 1;
  const cap = isVerified ? TRUST_MAX_VERIFIED : TRUST_MAX_NORMAL;

  if (newStreak >= SAFE_WALK_STREAK_THRESHOLD) {
    const bonused = trustScore + SAFE_WALK_BONUS;
    return {
      newTrustScore: Math.min(cap, parseFloat(bonused.toFixed(2))),
      newStreak: 0, // reset after bonus
    };
  }

  return {
    newTrustScore: trustScore, // no change yet
    newStreak,
  };
};

// ─────────────────────────────────────────────
// System 2: Block Safety Score Impact
// ─────────────────────────────────────────────

/**
 * Returns a multiplier based on the current hour.
 * Late night / early morning SOS carries more danger weight.
 * 10pm–4am → 1.5x | 8am–6pm → 0.7x | shoulders → 1.0x
 */
const getTimeOfDayMultiplier = () => {
  const hour = new Date().getHours();
  if (hour >= 22 || hour <= 4) return 1.5;
  if (hour >= 8 && hour <= 18) return 0.7;
  return 1.0;
};

/**
 * Decays accumulated weighted impact based on time elapsed since
 * the last SOS event. Half-life ≈ 70 hours (3 days of quiet = safer block).
 */
const applyTimeDecay = (impact, lastUpdated) => {
  if (!lastUpdated || !impact) return impact || 0;
  const hoursSince = (Date.now() - lastUpdated) / (1000 * 60 * 60);
  return impact * Math.exp(-0.01 * hoursSince);
};

/**
 * Computes the new block safety score using a time-aware Reverse Gaussian model.
 *
 *   effectiveTrust    = trustScore × timeOfDayMultiplier
 *   decayedImpact     = oldImpact × e^(−0.01 × hoursSinceLast)
 *   newWeightedImpact = decayedImpact + effectiveTrust
 *   current_score     = max(1.0, 10 × e^(−SCALE × newWeightedImpact))
 *
 * @param {number} currentWeightedImpact
 * @param {number} trustScore
 * @param {number|null} lastUpdated - timestamp (ms) of last block update
 * @returns {{ newWeightedImpact: number, newCurrentScore: number }}
 */
export const computeBlockSafetyImpact = (currentWeightedImpact, trustScore, lastUpdated = null) => {
  const effectiveTrust = (trustScore || 5.0) * getTimeOfDayMultiplier();
  const decayedImpact = applyTimeDecay(currentWeightedImpact || 0, lastUpdated);
  const newWeightedImpact = decayedImpact + effectiveTrust;
  const rawScore = 10 * Math.exp(-BLOCK_IMPACT_SCALE * newWeightedImpact);
  const newCurrentScore = Math.max(1.0, parseFloat(rawScore.toFixed(2)));

  return {
    newWeightedImpact: parseFloat(newWeightedImpact.toFixed(4)),
    newCurrentScore,
  };
};

