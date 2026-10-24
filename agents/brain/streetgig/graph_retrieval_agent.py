# agents/brain/graph_retrieval_agent.py
# PURPOSE: Multi-hop graph traversal to retrieve ranked candidate workers.
# STAGES:
#   1. Exact skill match  (hop 0)  — workers who have ALL primary required skills
#   2. Adjacent match     (hop 1)  — workers who have skills adjacent to required
#   3. Repeat-hire boost           — workers the employer has previously rated ≥ 4.0

from typing import List, Dict, Optional


async def get_candidate_pool(
    job_skill_ids: List[str],
    employer_id: str,
    lat: float,
    lng: float,
    radius_km: float = 10.0,
    db=None,
) -> List[Dict]:
    """
    Returns a list of candidate worker dicts with fields:
      worker_id, match_type (exact|adjacent|repeat), graph_score, matched_skills
    """
    candidates = {}

    # ── Stage 1: Exact matches ───────────────────────────────
    exact_edges = await db.graph_edges.find({
        'to_id': {'$in': job_skill_ids},
        'relationship': 'has_skill',
        'from_type': 'worker'
    }).to_list(length=500)

    worker_skill_counts = {}
    for edge in exact_edges:
        wid = edge['from_id']
        worker_skill_counts[wid] = worker_skill_counts.get(wid, []) + [edge['to_id']]

    for wid, skills in worker_skill_counts.items():
        overlap = len(set(skills) & set(job_skill_ids)) / max(len(job_skill_ids), 1)
        candidates[wid] = {
            'worker_id': wid,
            'match_type': 'exact',
            'graph_score': overlap,  # 1.0 = has all required skills
            'matched_skills': skills,
        }

    # ── Stage 2: Adjacent skill matches ──────────────────────
    skill_nodes = await db.skill_nodes.find(
        {'skill_id': {'$in': job_skill_ids}}
    ).to_list(length=50)

    adjacent_ids = []
    for node in skill_nodes:
        adjacent_ids.extend(node.get('adjacent_skills', []))
    adjacent_ids = list(set(adjacent_ids) - set(job_skill_ids))

    if adjacent_ids:
        adj_edges = await db.graph_edges.find({
            'to_id': {'$in': adjacent_ids},
            'relationship': 'has_skill',
            'from_type': 'worker'
        }).to_list(length=300)

        for edge in adj_edges:
            wid = edge['from_id']
            if wid not in candidates:
                candidates[wid] = {
                    'worker_id': wid,
                    'match_type': 'adjacent',
                    'graph_score': 0.65,  # adjacent carries 65% of exact weight
                    'matched_skills': [edge['to_id']],
                }

    # ── Stage 3: Repeat-hire boost ───────────────────────────
    repeat_edges = await db.graph_edges.find({
        'from_type': 'worker',
        'to_type': 'employer',
        'to_id': employer_id,
        'relationship': 'completed_for',
        'weight': {'$gte': 4.0}
    }).to_list(length=50)

    for edge in repeat_edges:
        wid = edge['from_id']
        repeat_count = edge.get('metadata', {}).get('repeat_count', 1)
        boost = min(0.15 * repeat_count, 0.30)  # max +30% boost
        if wid in candidates:
            candidates[wid]['graph_score'] = min(candidates[wid]['graph_score'] + boost, 1.0)
            candidates[wid]['repeat_hire'] = True
        else:
            candidates[wid] = {
                'worker_id': wid,
                'match_type': 'repeat',
                'graph_score': 0.50 + boost,
                'matched_skills': [],
                'repeat_hire': True,
            }

    return list(candidates.values())
