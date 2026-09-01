import asyncio
from langgraph.graph import StateGraph, START, END
from .state import AgentState, ReportCategory
from brain.civicconnect.electric_agent import electric_agent_node
from brain.civicconnect.waste_agent import waste_agent_node
from brain.civicconnect.water_agent import water_agent_node
from brain.civicconnect.infra_agent import infra_agent_node
from brain.civicconnect.finalizer import finalizer_node
from brain.civicconnect.locality_check_agent import locality_submission_graph
from brain.civicconnect.utils import image_preflight
# ── Node 1: Preflight ──────────────────────────────────────────────────────────
async def preflight_node(state: AgentState) -> dict:
    """
    Fast image validation before running the expensive 4-agent pipeline.
    Stores preflight_passed + preflight_hint in state.
    """
    print("🔍 Preflight check...")
    result = await image_preflight(
        image_url=state["imageUrl"],
        description=state.get("description", ""),
    )
    print(f"   → civic={result.is_civic_issue}  hint={result.civic_category_hint}")
    return {
        "preflight_passed": result.is_civic_issue,
        "preflight_hint": result.civic_category_hint,
        "preflight_rejection_reason": result.rejection_reason,
    }


# ── Node 2: Parallel fan-out (TRUE parallel via asyncio.gather) ───────────────
async def parallel_agents_node(state: AgentState) -> dict:
    """
    Runs all 4 specialist agents CONCURRENTLY.
    LangGraph's StateGraph does NOT natively parallelise multi-edge fan-outs,
    so we use asyncio.gather here and return all results at once.
    """
    print("🚀 Running 4 agents in parallel...")
    waste_coro   = waste_agent_node(state)
    water_coro   = water_agent_node(state)
    infra_coro   = infra_agent_node(state)
    electric_coro = electric_agent_node(state)

    results = await asyncio.gather(
        waste_coro, water_coro, infra_coro, electric_coro,
        return_exceptions=True,  # don't let one failure kill the others
    )

    merged = {}
    names = ["waste", "water", "infra", "electric"]
    for name, result in zip(names, results):
        if isinstance(result, Exception):
            print(f"  ⚠ {name}_agent failed: {result}")
        else:
            merged.update(result)

    return merged


# ── Node 3: Rejection path for non-civic images ────────────────────────────────
def preflight_reject_node(state: AgentState) -> dict:
    print("❌ Image rejected by preflight")
    return {
        "status": "REJECTED",
        "assigned_category": ReportCategory.UNCERTAIN,
        "aiAnalysis": state.get("preflight_rejection_reason", "Image not relevant to civic issues"),
        "title": "Rejected: Not a civic issue",
        "route": "",
        "updatedRoute": "",
    }


# ── Node 4: Locality / Save / Update (subgraph wrapper) ───────────────────────
async def run_submission_process(state: AgentState) -> dict:
    """
    Invokes the locality check → save/update subgraph.
    Only reached for valid categories (not UNCERTAIN, not REJECTED).
    """
    return await locality_submission_graph.ainvoke(state)


# ── Routing functions ──────────────────────────────────────────────────────────
def route_preflight(state: AgentState) -> str:
    if state.get("preflight_passed", True):
        return "parallel_agents"
    return "preflight_reject"


def route_after_finalizer(state: AgentState) -> str:
    category = state.get("assigned_category")
    if category == ReportCategory.UNCERTAIN:
        # Don't try to save UNCERTAIN reports to a department collection
        return "preflight_reject"
    return "submission_process"


# ── Graph assembly ─────────────────────────────────────────────────────────────
builder = StateGraph(AgentState)

builder.add_node("preflight",          preflight_node)
builder.add_node("parallel_agents",    parallel_agents_node)
builder.add_node("finalizer",          finalizer_node)
builder.add_node("preflight_reject",   preflight_reject_node)
builder.add_node("submission_process", run_submission_process)

builder.add_edge(START, "preflight")
builder.add_conditional_edges("preflight", route_preflight, {
    "parallel_agents": "parallel_agents",
    "preflight_reject": "preflight_reject",
})
builder.add_edge("parallel_agents", "finalizer")
builder.add_conditional_edges("finalizer", route_after_finalizer, {
    "submission_process": "submission_process",
    "preflight_reject":   "preflight_reject",
})
builder.add_edge("submission_process", END)
builder.add_edge("preflight_reject",   END)

app = builder.compile()