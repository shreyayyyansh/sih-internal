# agents/brain/graph_scorer.py
# PURPOSE: Combine vector similarity, graph path score, reputation, and recency.
# WEIGHTS (tune via env vars for A/B testing):
#   SCORE_W_VECTOR     = 0.40
#   SCORE_W_GRAPH      = 0.30
#   SCORE_W_REPUTATION = 0.20
#   SCORE_W_RECENCY    = 0.10

import os
import math
from datetime import datetime, timezone
from typing import List, Dict

W_VECTOR     = float(os.getenv('SCORE_W_VECTOR',     '0.40'))
W_GRAPH      = float(os.getenv('SCORE_W_GRAPH',      '0.30'))
W_REPUTATION = float(os.getenv('SCORE_W_REPUTATION', '0.20'))
W_RECENCY    = float(os.getenv('SCORE_W_RECENCY',    '0.10'))


def recency_score(last_active_iso: str | None) -> float:
    """Exponential decay. Full score = active today. Half score ≈ 30 days ago."""
    if not last_active_iso:
        return 0.5  # unknown = neutral
    try:
        last = datetime.fromisoformat(last_active_iso.replace('Z', '+00:00'))
        days_ago = (datetime.now(timezone.utc) - last).days
        return math.exp(-0.023 * days_ago)  # half-life = 30 days
    except Exception:
        return 0.5


def reputation_score(worker_id: str, graph_candidates: List[Dict], skill_node_avg: float) -> float:
    """
    Weighted reputation. New workers inherit the skill node average (cold-start fix).
    Workers with history use their actual completion edge ratings.
    """
    edges = [c for c in graph_candidates if c.get('worker_id') == worker_id]
    if not edges or not any('weight' in e for e in edges):
        # Cold start: inherit skill node average, normalised to 0-1
        return min(skill_node_avg / 5.0, 1.0) * 0.7  # discount vs earned reputation
    ratings = [e['weight'] for e in edges if 'weight' in e and e['weight'] > 0]
    if not ratings:
        return min(skill_node_avg / 5.0, 1.0) * 0.7
    return min(sum(ratings) / (len(ratings) * 5.0), 1.0)


def safety_multiplier(worker_id: str, safety_flags: List[Dict]) -> float:
    """Soft suppression. HIGH flag = 0.7×, CRITICAL = 0.5×."""
    worker_flags = [f for f in safety_flags if f.get('from_id') == worker_id]
    if not worker_flags:
        return 1.0
    worst = max(worker_flags, key=lambda f: {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}.get(f.get('metadata', {}).get('severity', 'LOW'), 1))
    severity = worst.get('metadata', {}).get('severity', 'LOW')
    return {'LOW': 1.0, 'MEDIUM': 0.85, 'HIGH': 0.70, 'CRITICAL': 0.50}.get(severity, 1.0)


def compute_final_score(
    vector_sim: float,
    graph_score: float,
    rep_score: float,
    last_active: str | None,
    worker_id: str,
    safety_flags: List[Dict],
) -> float:
    raw = (
        W_VECTOR     * vector_sim +
        W_GRAPH      * graph_score +
        W_REPUTATION * rep_score +
        W_RECENCY    * recency_score(last_active)
    )
    return round(raw * safety_multiplier(worker_id, safety_flags), 4)
