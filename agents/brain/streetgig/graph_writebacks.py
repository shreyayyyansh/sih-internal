# agents/brain/graph_writebacks.py
# PURPOSE: Write all graph edges after a job closes.
# CALL FROM: server/controllers/jobs.js close-and-rate endpoint
#            via POST /graph-writeback

from datetime import datetime, timezone
from typing import List, Optional


async def write_job_completion(
    worker_id: str,
    employer_id: str,
    job_id: str,
    skill_ids: List[str],
    rating: float,
    db,
):
    """
    Writes four types of edges:
      1. worker -> skill  (has_skill, reinforced by rating)
      2. worker -> employer (completed_for, with repeat_count increment)
      3. skill_node avg_rating update
      4. skill_timeline time-series record
    """
    now = datetime.now(timezone.utc)

    # 1. Worker -> Skill edges (upsert, update rating)
    for skill_id in skill_ids:
        await db.graph_edges.update_one(
            {'from_id': worker_id, 'to_id': skill_id, 'relationship': 'has_skill'},
            {'$set': {
                'from_type': 'worker', 'to_type': 'skill',
                'weight': rating, 'updated_at': now
            },
            '$setOnInsert': {'created_at': now}},
            upsert=True
        )

    # 2. Worker -> Employer edge (increment repeat_count)
    await db.graph_edges.update_one(
        {'from_id': worker_id, 'to_id': employer_id, 'relationship': 'completed_for'},
        {'$set': {
            'from_type': 'worker', 'to_type': 'employer',
            'weight': rating, 'updated_at': now
        },
         '$inc': {'metadata.repeat_count': 1},
         '$setOnInsert': {'created_at': now, 'metadata.job_id': job_id}},
        upsert=True
    )

    # 3. Update skill_node rolling average
    for skill_id in skill_ids:
        node = await db.skill_nodes.find_one({'skill_id': skill_id})
        if node:
            old_avg = node.get('avg_rating', 0.0)
            old_count = node.get('job_count', 0)
            new_avg = (old_avg * old_count + rating) / (old_count + 1)
            await db.skill_nodes.update_one(
                {'skill_id': skill_id},
                {'$set': {'avg_rating': round(new_avg, 2)}, '$inc': {'job_count': 1}}
            )

    # 4. Append to skill_timeline
    records = [{'worker_id': worker_id, 'skill_id': s, 'rating': rating, 'job_id': job_id, 'timestamp': now} for s in skill_ids]
    if records:
        await db.skill_timeline.insert_many(records)


async def write_safety_flag(
    worker_id: str,
    employer_id: str,
    severity: str,
    job_id: str,
    db,
):
    """
    Write a trust_flag edge. Severity: LOW | MEDIUM | HIGH | CRITICAL.
    Called by safety_agent when severity >= HIGH.
    """
    now = datetime.now(timezone.utc)
    await db.graph_edges.update_one(
        {'from_id': worker_id, 'to_id': employer_id, 'relationship': 'trust_flag'},
        {'$set': {
            'from_type': 'worker', 'to_type': 'employer',
            'metadata': {'severity': severity, 'job_id': job_id},
            'created_at': now, 'updated_at': now
        }},
        upsert=True
    )


async def write_scheme_completion(
    worker_id: str,
    scheme_id: str,
    skill_ids_taught: List[str],
    certified: bool,
    db,
):
    """
    Write a completed_scheme edge. Workers with certified=True get a 1.15x boost
    on jobs requiring those skills (applied in graph_scorer.py).
    """
    now = datetime.now(timezone.utc)
    await db.graph_edges.update_one(
        {'from_id': worker_id, 'to_id': scheme_id, 'relationship': 'completed_scheme'},
        {'$set': {
            'from_type': 'worker', 'to_type': 'scheme',
            'metadata': {'certified': certified, 'skills_taught': skill_ids_taught},
            'updated_at': now
        },
         '$setOnInsert': {'created_at': now}},
        upsert=True
    )
    # Also write has_skill edges for the skills this scheme teaches
    if certified:
        for skill_id in skill_ids_taught:
            await db.graph_edges.update_one(
                {'from_id': worker_id, 'to_id': skill_id, 'relationship': 'has_skill'},
                {'$set': {
                    'from_type': 'worker', 'to_type': 'skill',
                    'weight': 4.0, 'metadata.certified': True, 'updated_at': now
                },
                 '$setOnInsert': {'created_at': now}},
                upsert=True
            )
