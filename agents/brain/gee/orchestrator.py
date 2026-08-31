from langgraph.graph import StateGraph, END
from brain.gee.state import GeoIntelligenceState
from brain.gee.vision_node import analyze_vision
from brain.gee.synthesis_node import synthesize_report

# Initialize the state graph
builder = StateGraph(GeoIntelligenceState)

# Add nodes
builder.add_node("vision", analyze_vision)
builder.add_node("synthesis", synthesize_report)

# Define edges
builder.set_entry_point("vision")
builder.add_edge("vision", "synthesis")
builder.add_edge("synthesis", END)

# Compile graph
intelligence_orchestrator = builder.compile()
