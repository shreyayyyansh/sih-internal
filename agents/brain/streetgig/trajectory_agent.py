# agents/brain/trajectory_agent.py
# PURPOSE: Compute exponentially-weighted skill score from skill_timeline.
# WEIGHT: alpha=0.3 — recent ratings dominate, old ones decay smoothly.

from typing import Dict, List

ALPHA = 0.3  # EWA decay: higher = more weight on recent ratings


async def get_skill_trajectory(worker_id: str, skill_id: str, db) -> Dict:
    """
    Returns:
      ewa_score:    float  exponentially-weighted average (0-5)
      raw_avg:      float  simple average
      trend:        str    'improving' | 'stable' | 'declining' | 'insufficient_data'
      job_count:    int
    """
    records = await db.skill_timeline.find(
        {'worker_id': worker_id, 'skill_id': skill_id},
        sort=[('timestamp', 1)]  # oldest first for EWA computation
    ).to_list(length=50)

    if not records:
        return {'ewa_score': 0.0, 'raw_avg': 0.0, 'trend': 'insufficient_data', 'job_count': 0}

    ratings = [r['rating'] for r in records]

    # Exponentially weighted average
    ewa = ratings[0]
    for r in ratings[1:]:
        ewa = ALPHA * r + (1 - ALPHA) * ewa

    raw_avg = sum(ratings) / len(ratings)

    # Trend: compare first-half average to second-half average
    if len(ratings) >= 4:
        mid = len(ratings) // 2
        first_half = sum(ratings[:mid]) / mid
        second_half = sum(ratings[mid:]) / (len(ratings) - mid)
        if second_half - first_half > 0.5:
            trend = 'improving'
        elif first_half - second_half > 0.5:
            trend = 'declining'
        else:
            trend = 'stable'
    else:
        trend = 'insufficient_data'

    return {
        'ewa_score': round(ewa, 2),
        'raw_avg': round(raw_avg, 2),
        'trend': trend,
        'job_count': len(ratings),
    }


def apply_trajectory_boost(base_score: float, trend: str, ewa: float, raw_avg: float) -> float:
    """
    If a worker is on an improving trajectory, boost their score.
    Max boost: +8% for 'improving' trend with EWA significantly above raw avg.
    """
    if trend == 'improving' and ewa > raw_avg:
        delta = min((ewa - raw_avg) / 5.0, 0.08)
        return min(base_score + delta, 1.0)
    return base_score
