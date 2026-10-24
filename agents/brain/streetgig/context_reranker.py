# agents/brain/context_reranker.py
# PURPOSE: LLM re-ranks top candidates using graph context, generates match explanations.
# CALL: After graph_scorer produces scores, take top-20, pass to this, return top-10.

from pydantic import BaseModel, Field
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage


class RankedCandidate(BaseModel):
    worker_id: str
    final_rank: int
    match_reason: str = Field(description="1-2 sentence plain English explanation of why this worker fits")
    confidence: float = Field(description="0.0-1.0 overall confidence in this match")

class RerankerOutput(BaseModel):
    candidates: List[RankedCandidate]

llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash', temperature=0.2)
reranker = llm.with_structured_output(RerankerOutput)


async def contextual_rerank(
    job_description: str,
    job_skills: List[str],
    scored_candidates: List[dict],
) -> List[RankedCandidate]:
    """
    scored_candidates: list of dicts with worker_id, score, match_type,
                       matched_skills, trend, ewa_score, repeat_hire
    """
    candidates_text = '\n'.join([
        f"- Worker {c['worker_id']}: score={c.get('final_score', 0):.3f}, "
        f"match={c.get('match_type', 'unknown')}, "
        f"skills={c.get('matched_skills', [])}, "
        f"trend={c.get('trend', 'unknown')}, "
        f"repeat_hire={c.get('repeat_hire', False)}"
        for c in scored_candidates[:20]
    ])

    prompt = f'''
You are a hiring AI for a local gig marketplace.

JOB REQUIREMENTS:
{job_description}
Required skills: {job_skills}

CANDIDATE POOL (pre-scored):
{candidates_text}

Re-rank these candidates and for each write a 1-2 sentence explanation of why they are a good match.
Prioritise: exact skill match > improving trajectory > repeat hire history > adjacent skills.
Return ALL candidates in your re-ranked order.
'''

    try:
        result = await reranker.ainvoke([HumanMessage(content=prompt)])
        return result.candidates
    except Exception as e:
        print(f'Re-ranker failed, returning pre-scored order: {e}')
        return [RankedCandidate(
            worker_id=c['worker_id'],
            final_rank=i+1,
            match_reason='Graph-scored match.',
            confidence=c.get('final_score', 0.5)
        ) for i, c in enumerate(scored_candidates[:10])]
