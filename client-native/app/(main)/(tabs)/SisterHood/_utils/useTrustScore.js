import { useCallback } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../../../../../lib/firebase';
import { useAuthStore } from '../../../../../store/useAuthStore';
import { api } from '../../../../../lib/api';
import {
  applyFalseAlarmPenalty,
  applyRealEmergencyBoost,
  applySafeWalkStreakBonus,
} from './trustScoreManager';

/**
 * useTrustScore
 * Manages the trust score lifecycle for the SisterHood feature.
 * Handles three resolution outcomes and the safe-walk-exit flow.
 */
export const useTrustScore = () => {
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);

  /**
   * Handles the post-SOS resolution modal outcome.
   * @param {'FALSE_ALARM' | 'REAL_EMERGENCY'} outcome
   */
  const handleSOSResolution = useCallback(async (outcome) => {
    if (!user?.id) return;

    const currentTrust = user.trust_score ?? 5.0;
    const currentFalseCount = user.false_sos_count ?? 0;
    const currentStreak = user.safe_walk_streak ?? 0;
    const isVerified = user.is_verified ?? false;

    let newTrustScore = currentTrust;
    let newFalseCount = currentFalseCount;
    let newStreak = currentStreak;

    if (outcome === 'FALSE_ALARM') {
      const result = applyFalseAlarmPenalty(currentTrust, currentFalseCount);
      newTrustScore = result.newTrustScore;
      newFalseCount = result.newFalseCount;
      newStreak = result.newStreak;
      console.log(`🚨 False Alarm penalty applied: trust ${currentTrust.toFixed(2)} → ${newTrustScore}`);
    } else if (outcome === 'REAL_EMERGENCY') {
      const result = applyRealEmergencyBoost(currentTrust);
      newTrustScore = result.newTrustScore;
      console.log(`🦸 Real Emergency boost applied: trust ${currentTrust.toFixed(2)} → ${newTrustScore}`);
    }

    const updates = {
      trust_score: newTrustScore,
      false_sos_count: newFalseCount,
      safe_walk_streak: newStreak,
    };

    // 1. Update Zustand immediately (optimistic)
    updateUser(updates);

    // 2. Sync to RTDB users node
    try {
      await update(ref(db, `users/${user.id}`), updates);
    } catch (e) {
      console.error('Failed to sync trust score to RTDB:', e);
    }
  }, [user, updateUser]);

  /**
   * Called on clean exit without any SOS. Increments safe_walk_streak
   * and applies streak bonus if threshold reached.
   * Also fires the server flush to Firestore.
   */
  const handleSafeWalkExit = useCallback(async () => {
    if (!user?.id) return;

    const currentTrust = user.trust_score ?? 5.0;
    const currentStreak = user.safe_walk_streak ?? 0;
    const isVerified = user.is_verified ?? false;

    const { newTrustScore, newStreak } = applySafeWalkStreakBonus(currentTrust, currentStreak, isVerified);

    if (newStreak !== currentStreak || newTrustScore !== currentTrust) {
      console.log(`🚶 Safe walk streak: ${currentStreak + 1}, trust: ${currentTrust} → ${newTrustScore}`);
    }

    const updates = {
      trust_score: newTrustScore,
      safe_walk_streak: newStreak,
      false_sos_count: user.false_sos_count ?? 0,
    };

    updateUser(updates);

    // Fire Firestore sync to server (best effort on exit)
    await flushTrustScoreToServer(user.id, updates);
  }, [user, updateUser]);

  /**
   * Flushes the final trust score state to Firestore via the server.
   * Should be called during graceful exit via useGracefulExit's onBeforeExit.
   */
  const flushTrustScoreToServer = useCallback(async (userId, overrideUpdates = null) => {
    if (!userId) return;

    const payload = overrideUpdates ?? {
      trust_score: user?.trust_score ?? 5.0,
      false_sos_count: user?.false_sos_count ?? 0,
      safe_walk_streak: user?.safe_walk_streak ?? 0,
    };

    try {
      await api.patch('/api/user/sisterhood-exit', payload);
      console.log('✅ Trust score flushed to Firestore on exit.');
    } catch (e) {
      console.error('Failed to flush trust score to server:', e.message);
    }
  }, [user]);

  return { handleSOSResolution, handleSafeWalkExit, flushTrustScoreToServer };
};
