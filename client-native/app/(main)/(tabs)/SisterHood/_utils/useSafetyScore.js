import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../../../lib/firebase';

/**
 * Custom hook to fetch and monitor the safety score of a specific geohash block.
 * @param {string} geohash8 - The 8-character geohash of the block.
 * @returns {Object} { safetyScore, getScoreColor }
 */
export const useSafetyScore = (geohash8) => {
  const [safetyScore, setSafetyScore] = useState(10.0);

  useEffect(() => {
    if (!geohash8) return;

    const scoreRef = ref(db, `blocks/${geohash8}/block_state/safety_metrics/current_score`);
    
    const listener = onValue(scoreRef, (snapshot) => {
      if (snapshot.exists()) {
        setSafetyScore(snapshot.val());
      } else {
        // Fallback to default if block doesn't exist yet in RTDB
        setSafetyScore(10.0);
      }
    });

    return () => off(scoreRef, 'value', listener);
  }, [geohash8]);

  /**
   * Returns a color hex code based on the safety score.
   * @param {number} score - The safety score (0-10).
   * @returns {string} Hex color code.
   */
  const getScoreColor = (score) => {
    if (score >= 9) return '#22c55e'; // Green (Safe)
    if (score >= 7) return '#84cc16'; // Lime/Yellow-Green
    if (score >= 5) return '#eab308'; // Yellow
    if (score >= 3) return '#f97316'; // Orange
    return '#ef4444'; // Red (Danger)
  };

  return { safetyScore, getScoreColor };
};
