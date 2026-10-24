import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from brain.gee.state import GeoIntelligenceState

def analyze_vision(state: GeoIntelligenceState) -> GeoIntelligenceState:
    module = state.get("module_type", "unknown")
    stats = state.get("summary_stats", {})
    history = state.get("historical_reports", [])
    
    # Build context string
    history_context = ""
    if history:
        history_context = "\n".join([f"Report {i+1}: {json.dumps(r, default=str)}" for i, r in enumerate(history[:3])])
    
    prompt = f"""You are GeoScope AI, an expert geospatial intelligence analyst.
    
    Analyze the following Earth observation metrics and historical data:
    Module: {module.upper()}
    Current Metrics: {json.dumps(stats, indent=2, default=str)}
    Historical Context: {history_context if history_context else 'No previous data.'}
    
    Write a 3-4 sentence detailed analytical breakdown describing what this data implies for the region. Focus on the raw meaning of the numbers and trends. Do not format as JSON."""

    model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.2)
    print(f"👁️  [Vision] Analyzing primary metrics for {state['module_type']}...", flush=True)
    raw_analysis = model.invoke([HumanMessage(content=prompt)])
    print("✅ [Vision] Raw analysis complete.", flush=True)
    
    return {"vision_analysis": raw_analysis.content}
