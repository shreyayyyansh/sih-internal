from brain.urbanconnect.state_civic_analysis import CivicAnalysisState

def route_after_triage(state: CivicAnalysisState):
    """Routes POLICY_RUMOR posts to fact-checking, others skip it."""
    if state.get("post_type") == "POLICY_RUMOR":
        return "fact_check"
    return "end"