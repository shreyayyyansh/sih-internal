# agents/brain/skill_graph_agent.py
# PURPOSE: Extract discrete skill entities from free-form text.
# CALL FROM: job_agent.py (after enrich_job_data) and
#            server route when worker registers profile.

import os
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()


class SkillEntity(BaseModel):
    skill_id: str = Field(description="Lowercase snake_case canonical name. e.g. pipe_fitting, not 'Pipe Fitting'")
    display_name: str = Field(description="Human-readable name")
    confidence: float = Field(description="0.0-1.0 how certain this skill is genuinely required/held")
    is_primary: bool = Field(description="True if this is a core skill, False if adjacent/nice-to-have")


class SkillExtractionResult(BaseModel):
    skills: List[SkillEntity]
    experience_level: str = Field(description="entry | mid | expert")
    category_guess: str = Field(description="The StreetGig category this maps to, e.g. Plumber, Electrician")


llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash', temperature=0, max_retries=2)
extractor = llm.with_structured_output(SkillExtractionResult)


SYSTEM_PROMPT = '''
You are a labour-market ontology specialist. Extract discrete, atomic skills from the provided text.
Rules:
1. Each skill_id must be lowercase snake_case and represent ONE specific competency.
   Good: pipe_fitting, high_voltage_wiring, drywall_finishing
   Bad:  plumbing_and_electrical, general_construction
2. Extract 3-8 skills. Do not pad with generic skills like 'communication' or 'teamwork'.
3. Confidence < 0.5 means the skill is implied but not stated. Include only if it changes matching.
4. is_primary=True skills are the non-negotiable ones. is_primary=False are useful extras.
'''


async def extract_skills(text: str) -> SkillExtractionResult:
    """Call this with a job description or worker profile description."""
    message = HumanMessage(content=[
        {'type': 'text', 'text': SYSTEM_PROMPT + f'\n\nTEXT TO ANALYSE:\n{text}'}
    ])
    try:
        return await extractor.ainvoke([message])
    except Exception as e:
        print(f'Skill extraction failed: {e}')
        return SkillExtractionResult(skills=[], experience_level='mid', category_guess='Other')


async def upsert_skill_nodes(skills: List[SkillEntity], db_collection):
    """
    Upsert extracted skills into the skill_nodes MongoDB collection.
    Call this after extract_skills() for both jobs and worker registration.
    """
    for skill in skills:
        await db_collection.update_one(
            {'skill_id': skill.skill_id},
            {'$setOnInsert': {
                'skill_id': skill.skill_id,
                'display_name': skill.display_name,
                'adjacent_skills': [],
                'category_tags': [],
                'avg_rating': 0.0,
                'worker_count': 0,
                'job_count': 0,
            }},
            upsert=True
        )
    return [s.skill_id for s in skills]
