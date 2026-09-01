from langgraph.graph import StateGraph, END
from brain.urbanconnect.state_civic_analysis import CivicAnalysisState
from brain.urbanconnect.triage_and_sentiment import triage_and_sentiment
from brain.urbanconnect.vectorize_and_cluster import vectorize_and_cluster
from brain.urbanconnect.rag_fact_check import rag_fact_check
from brain.urbanconnect.route import route_after_triage
# --- Graph Assembly ---

graph = StateGraph(CivicAnalysisState)
    
graph.add_node("triage_and_sentiment", triage_and_sentiment)
graph.add_node("vectorize_and_cluster", vectorize_and_cluster)
graph.add_node("rag_fact_check", rag_fact_check)

# Triage runs first
graph.set_entry_point("triage_and_sentiment")

# 1. Triage -> Vectorize (Always)
graph.add_edge("triage_and_sentiment", "vectorize_and_cluster")

# 2. Vectorize -> Fact-Check (Conditional)
graph.add_conditional_edges(
    "vectorize_and_cluster",
    route_after_triage,
    {
        "fact_check": "rag_fact_check",
        "end": END
    }
)

# 3. Fact-Check -> End
graph.add_edge("rag_fact_check", END)

civic_analysis_workflow = graph.compile()
