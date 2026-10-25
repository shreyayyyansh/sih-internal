/**
 * trustScoreManager.js
 * Pure math utilities for the trust score lifecycle.
 * No external dependencies — safe to import anywhere.
 */

const TRUST_MIN = 1.0;
const TRUST_MAX_NORMAL = 7.5;
const TRUST_MAX_VERIFIED = 10.0;
const SAFE_WALK_STREAK_THRESHOLD = 5;
const SAFE_WALK_BONUS = 0.5;
const FALSE_ALARM_DECAY = 0.4;
const REAL_EMERGENCY_BOOST = 1.0;

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

// Block safety scores are computed offline on the server (server/src/jobs/safetyScoreJob.js)
// from logged SOS events; the app no longer writes them.
