from pydantic import BaseModel, Field, validator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from brain.civicconnect.state import AgentState, ReportCategory, SeverityLevel

# ── Route maps ─────────────────────────────────────────────────────────────────
ROUTE_MAPPING = {
    ReportCategory.WATER:          "reports/waterReports",
    ReportCategory.WASTE:          "reports/wasteReports",
    ReportCategory.INFRASTRUCTURE: "reports/infrastructureReports",
    ReportCategory.ELECTRICITY:    "reports/electricityReports",
    ReportCategory.UNCERTAIN:      "reports/uncertainReports",
}

UPDATED_ROUTE_MAPPING = {
    ReportCategory.WATER:          "reports/updatewaterReports",
    ReportCategory.WASTE:          "reports/updatewasteReports",
    ReportCategory.INFRASTRUCTURE: "reports/updateinfrastructureReports",
    ReportCategory.ELECTRICITY:    "reports/updateelectricityReports",
}

# ── Minimum confidence to trust an agent's verdict ─────────────────────────────
MIN_CONFIDENCE_THRESHOLD = 0.35


# ── Structured output schema ───────────────────────────────────────────────────
class FinalVerdict(BaseModel):
    selected_category: str = Field(
        description="Exactly one of: WATER, WASTE, INFRASTRUCTURE, ELECTRICITY, UNCERTAIN"
    )
    title: str = Field(description="Max 10-word incident title")
    severity: str = Field(description="Exactly one of: LOW, MEDIUM, HIGH, CRITICAL")
    reasoning: str = Field(description="Conflict resolution rationale, max 2 sentences")

    @validator("selected_category")
    def validate_category(cls, v):
        allowed = {"WATER", "WASTE", "INFRASTRUCTURE", "ELECTRICITY", "UNCERTAIN"}
        v = v.upper().strip()
        if v not in allowed:
            return "UNCERTAIN"
        return v

    @validator("severity")
    def validate_severity(cls, v):
        allowed = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        v = v.upper().strip()
        return v if v in allowed else "LOW"


# ── LLM ────────────────────────────────────────────────────────────────────────
judge_llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    max_retries=2,
).with_structured_output(FinalVerdict)

JUDGE_SYSTEM_PROMPT = """
You are the City Operations Supervisor — the final arbiter for a civic grievance system.

Four specialist agents have each analysed the same image. Your job:
1. Compare their confidence scores and reasoning.
2. Pick ONE winning department.
3. Resolve overlaps using these rules:
   - "Water on road" → WATER (unless the road is clearly broken with no water context)
   - "Trash in drain causing flood" → WASTE (the trash is the root cause)
   - "Broken streetlight" → ELECTRICITY (structural pole without wires → INFRASTRUCTURE)
   - "Open manhole with no water" → INFRASTRUCTURE
4. If ALL agents score below 0.35, output UNCERTAIN.

The preflight agent's category hint is advisory — weight it only if agents are tied.
"""


async def finalizer_node(state: AgentState) -> dict:
    print("⚖️ Judge agent deciding...")

    waste    = state.get("waste_analysis")
    water    = state.get("water_analysis")
    infra    = state.get("infra_analysis")
    electric = state.get("electric_analysis")

    # ── Fast path: if all confidences are low → UNCERTAIN ─────────────────────
    all_analyses = [a for a in [waste, water, infra, electric] if a is not None]
    if all_analyses:
        max_confidence = max(a.confidence for a in all_analyses)
        if max_confidence < MIN_CONFIDENCE_THRESHOLD:
            print(f"  All confidences below threshold ({max_confidence:.2f}) → UNCERTAIN")
            return _build_result(ReportCategory.UNCERTAIN, SeverityLevel.LOW,
                                 "No agent reached minimum confidence threshold.",
                                 "Unclassified civic issue")

    # ── Build judge context ────────────────────────────────────────────────────
    def fmt(name, data):
        if not data:
            return f"{name}: did not produce a result."
        return (
            f"{name}:\n"
            f"  confidence={data.confidence:.2f}  severity={data.severity}\n"
            f"  title='{data.title}'\n"
            f"  reasoning='{data.reasoning}'"
        )

    hint = state.get("preflight_hint", "UNKNOWN")
    context = (
        f"USER DESCRIPTION: '{state.get('description', 'none')}'\n"
        f"PREFLIGHT HINT: {hint}\n\n"
        f"--- AGENT REPORTS ---\n"
        f"{fmt('WASTE AGENT', waste)}\n\n"
        f"{fmt('WATER AGENT', water)}\n\n"
        f"{fmt('INFRASTRUCTURE AGENT', infra)}\n\n"
        f"{fmt('ELECTRICITY AGENT', electric)}"
    )

    try:
        verdict: FinalVerdict = await judge_llm.ainvoke([
            SystemMessage(content=JUDGE_SYSTEM_PROMPT),
            HumanMessage(content=context),
        ])

        category = _safe_category(verdict.selected_category)
        severity = _safe_severity(verdict.severity)

        return _build_result(category, severity, verdict.reasoning, verdict.title)

    except Exception as e:
        print(f"⚠ Judge agent failed: {e} — using confidence fallback")
        return _confidence_fallback(waste, water, infra, electric)


# ── Helpers ────────────────────────────────────────────────────────────────────
def _build_result(category, severity, reasoning, title):
    return {
        "assigned_category": category,
        "severity":          severity,
        "aiAnalysis":        reasoning,
        "title":             title,
        "route":             ROUTE_MAPPING.get(category, ROUTE_MAPPING[ReportCategory.UNCERTAIN]),
        "updatedRoute":      UPDATED_ROUTE_MAPPING.get(category),
    }


def _safe_category(raw: str) -> ReportCategory:
    try:
        return ReportCategory(raw.upper())
    except ValueError:
        return ReportCategory.UNCERTAIN


def _safe_severity(raw: str) -> SeverityLevel:
    try:
        return SeverityLevel(raw.upper())
    except ValueError:
        return SeverityLevel.LOW


def _confidence_fallback(waste, water, infra, electric):
    candidates = [
        (ReportCategory.WASTE, waste),
        (ReportCategory.WATER, water),
        (ReportCategory.INFRASTRUCTURE, infra),
        (ReportCategory.ELECTRICITY, electric),
    ]
    valid = [(cat, data) for cat, data in candidates if data is not None]
    if not valid:
        return _build_result(ReportCategory.UNCERTAIN, SeverityLevel.LOW,
                             "No agent data available.", "System error")

    best_cat, best_data = max(valid, key=lambda x: x[1].confidence)
    return _build_result(best_cat, best_data.severity,
                         best_data.reasoning + " (confidence fallback)",
                         best_data.title)