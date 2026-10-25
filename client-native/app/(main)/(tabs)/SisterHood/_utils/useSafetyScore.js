import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../../../lib/firebase';

// Below this the score is mostly prior, not data — show "unknown" instead of a fake number
export const MIN_CONFIDENCE = 0.3;
const UNKNOWN_COLOR = '#71717a';

// Must match the buckets in server/src/jobs/safetyScoreJob.js
const currentBucket = () => {
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 5) return 'night';
  if (hour >= 17) return 'evening';
  return 'day';
};

const usable = (entry) => (entry && entry.confidence >= MIN_CONFIDENCE ? entry.score : null);

/**
 * Reads offline-computed safety scores from RTDB `safety_tiles/{geo6}` (published by the server job).
 * @param {string} geohash8 - The block the user is in (already hysteresis-filtered by the caller).
 * @param {Array<string>} aheadCells - geohash8 blocks ~100 m ahead while walking.
 * @returns {{ safetyScore: number|null, confidence: number, bucket: {name: string, score: number}|null,
 *             aheadScore: number|null, getScoreColor: Function }}
 */
export const useSafetyScore = (geohash8, aheadCells = []) => {
  const [tiles, setTiles] = useState({});

  // Subscribe per geo6 tile, keyed on the set of tiles so walking inside a tile doesn't resubscribe
  const tileKey = useMemo(() => {
    const ids = new Set([geohash8, ...aheadCells].filter(Boolean).map(c => c.slice(0, 6)));
    return [...ids].sort().join(',');
  }, [geohash8, aheadCells]);

  useEffect(() => {
    if (!tileKey) return;
    const ids = tileKey.split(',');
    const subs = ids.map((geo6) => {
      const tileRef = ref(db, `safety_tiles/${geo6}/cells`);
      const listener = onValue(tileRef, (snapshot) => {
        setTiles(prev => ({ ...prev, [geo6]: snapshot.val() || {} }));
      });
      return () => off(tileRef, 'value', listener);
    });
    // Drop tiles we no longer listen to
    setTiles(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => ids.includes(k))));
    return () => subs.forEach(unsub => unsub());
  }, [tileKey]);

  const cellOf = (geo8) => (geo8 ? tiles[geo8.slice(0, 6)]?.[geo8] : null);

  const cell = cellOf(geohash8);
  const safetyScore = usable(cell);
  const bucketName = currentBucket();
  const bucketScore = usable(cell?.buckets?.[bucketName]);

  const aheadScores = aheadCells
    .filter(c => c && c !== geohash8)
    .map(c => usable(cellOf(c)))
    .filter(s => s !== null);
  const aheadScore = aheadScores.length ? Math.min(...aheadScores) : null;

  /**
   * Returns a color hex code based on the safety score.
   * @param {number|null} score - The safety score (1-10), or null when unknown.
   * @returns {string} Hex color code.
   */
  const getScoreColor = (score) => {
    if (score === null || score === undefined) return UNKNOWN_COLOR; // Grey (Not enough data)
    if (score >= 9) return '#22c55e'; // Green (Safe)
    if (score >= 7) return '#84cc16'; // Lime/Yellow-Green
    if (score >= 5) return '#eab308'; // Yellow
    if (score >= 3) return '#f97316'; // Orange
    return '#ef4444'; // Red (Danger)
  };

  return {
    safetyScore,
    confidence: cell?.confidence ?? 0,
    bucket: bucketScore !== null ? { name: bucketName, score: bucketScore } : null,
    aheadScore,
    getScoreColor,
  };
};
