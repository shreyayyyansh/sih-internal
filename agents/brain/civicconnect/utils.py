from typing import Optional
from pydantic import BaseModel, Field, validator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from brain.civicconnect.state import AgentAnalysis, SeverityLevel

# ── LLM instances ─────────────────────────────────────────────────────────────
# Main model — used for 4-agent analysis
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    max_retries=2,
)

# Preflight model — cheaper/faster; only used for relevance check
preflight_llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    max_retries=1,
)
# ── Structured output schemas ──────────────────────────────────────────────────
class AgentOutput(BaseModel):
    title: str = Field(description="Max 10-word summary of the visible issue")
    confidence: float = Field(ge=0.0, le=1.0, description="How certain this is YOUR department's issue")
    severity: SeverityLevel
    reasoning: str = Field(description="Why this is/isn't your jurisdiction")

    @validator("confidence")
    def clamp_confidence(cls, v):
        return round(max(0.0, min(1.0, v)), 3)


class PreflightResult(BaseModel):
    is_civic_issue: bool = Field(description="True if image shows a real urban/civic problem")
    civic_category_hint: str = Field(
        description="One of: WASTE, WATER, INFRASTRUCTURE, ELECTRICITY, UNCERTAIN, IRRELEVANT"
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        description="If is_civic_issue=False, explain why (blurry, selfie, indoors, etc.)"
    )
# ── Structured LLMs ───────────────────────────────────────────────────────────
structured_agent_llm = llm.with_structured_output(AgentOutput)
structured_preflight_llm = preflight_llm.with_structured_output(PreflightResult)


# ── Shared system context injected into every agent prompt ────────────────────
GLOBAL_CONTEXT = """
SYSTEM ARCHITECTURE:
You are one of 4 parallel specialist agents in a civic grievance classification system.
The 4 departments are: WASTE · WATER · ELECTRICITY · INFRASTRUCTURE

YOUR CONFIDENCE SCORE is not "do I see something" — it is "is this MY department's responsibility".
- 0.0–0.25: Clearly belongs to another department
- 0.26–0.55: Ambiguous / overlapping
- 0.56–1.0: Unambiguously mine

"""
# ── Retry decorator ────────────────────────────────────────────────────────────
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _invoke_with_retry(chain, messages: list) -> AgentOutput:
    return await chain.ainvoke(messages)


# ── Core analysis function ─────────────────────────────────────────────────────
async def analyze_image_category(
    image_url: str,
    system_prompt: str,
    user_description: str = "",
) -> AgentAnalysis:
    """
    Calls a specialist agent LLM with structured output (no JSON string parsing).
    Retries up to 3× on transient failures.
    """
    context_text = "Analyse this image for your jurisdiction."
    if user_description:
        context_text += (
            f"\n\nCITIZEN'S DESCRIPTION: '{user_description}'\n"
            "(Use for context but prioritise visual evidence for severity.)"
        )

    final_system_prompt = GLOBAL_CONTEXT + "\n\n" + system_prompt

    message = HumanMessage(
        content=[
            {"type": "text", "text": context_text},
            {"type": "image_url", "image_url": image_url},
        ]
    )

    try:
        result: AgentOutput = await _invoke_with_retry(
            structured_agent_llm,
            [SystemMessage(content=final_system_prompt), message],
        )
        return AgentAnalysis(
            title=result.title,
            confidence=result.confidence,
            severity=result.severity,
            reasoning=result.reasoning,
        )
    except Exception as e:
        print(f"⚠ Agent analysis failed after 3 retries: {e}")
        return AgentAnalysis(
            title="Analysis failed",
            confidence=0.0,
            severity=SeverityLevel.LOW,
            reasoning=f"Error during analysis: {str(e)}",
        )
# ── Preflight check ────────────────────────────────────────────────────────────
PREFLIGHT_SYSTEM = """
You are an image relevance gatekeeper for a CIVIC GRIEVANCE PORTAL.
Citizens submit photos of urban problems (garbage, flooding, potholes, broken wires, etc.).

REJECT the image if it is:
- A selfie, face photo, or people-only shot
- An interior room / household item with no visible outdoor civic issue
- A text screenshot, document, or app UI
- Completely blurry or too dark to see anything
- A vehicle interior or interior building (unless the issue is clearly civic)

APPROVE if the image shows ANY outdoor civic problem, even partially.
Set is_civic_issue accordingly and suggest the most likely category.
"""


async def image_preflight(image_url: str, description: str = "") -> PreflightResult:
    """
    Fast O(1) check before running the full 4-agent pipeline.
    Returns PreflightResult with is_civic_issue and a category hint.
    """
    text = "Is this a valid civic grievance image?"
    if description:
        text += f" Citizen described: '{description}'"

    message = HumanMessage(
        content=[
            {"type": "text", "text": text},
            {"type": "image_url", "image_url": image_url},
        ]
    )
    try:
        result: PreflightResult = await structured_preflight_llm.ainvoke(
            [SystemMessage(content=PREFLIGHT_SYSTEM), message]
        )
        return result
    except Exception as e:
        print(f"⚠ Preflight check failed: {e} — defaulting to APPROVE")
        return PreflightResult(
            is_civic_issue=True,
            civic_category_hint="UNCERTAIN",
            rejection_reason=None,
        )