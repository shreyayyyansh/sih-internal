from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field
from brain.gee.state import GeoIntelligenceState

class IntelligenceReportModel(BaseModel):
    severity: str = Field(description="Must be exactly one of: 'LOW', 'MODERATE', 'HIGH', or 'CRITICAL'")
    pattern_detected: str = Field(description="A 1-2 sentence description of the spatial or temporal pattern observed in the data")
    probable_cause: str = Field(description="A 1-2 sentence hypothesis for the root cause of the environmental metric")
    recommended_action: str = Field(description="A 1-2 sentence actionable recommendation for municipal stakeholders")
    confidence: float = Field(description="Float between 0.0 and 1.0 representing AI confidence in this diagnosis")

def synthesize_report(state: GeoIntelligenceState) -> GeoIntelligenceState:
    vision_analysis = state.get("vision_analysis", "")
    module_type = state.get("module_type", "unknown")
    region_id = state.get("region_id", "unknown")
    
    prompt = f"""You are GeoScope AI. Based on the following raw spatial analysis, synthesize the final structured intelligence report.
    
    Module Under Analysis: {module_type.upper()}
    Region ID: {region_id}
    
    Raw Analysis from Vision Node:
    {vision_analysis}
    
    Produce a structured intelligence report diagnosing the severity, pattern, cause, and recommended action. Ensure the severity matches the tone of the raw analysis."""

    try:
        model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.1)
        structured_model = model.with_structured_output(IntelligenceReportModel)
        # Invoke Gemini for structured synthesis
        print(f"✍️  [Synthesis] Formatting final report for {state['region_id']}...", flush=True)
        response = structured_model.invoke([HumanMessage(content=prompt)])
        print("✅ [Synthesis] Structured report synthesized.", flush=True)
        report = response.dict()
    except Exception as e:
        report = {
            "severity": "UNKNOWN",
            "pattern_detected": f"AI synthesis failed: {str(e)}",
            "probable_cause": "System internal error during structured generation.",
            "recommended_action": "Check application logs for details.",
            "confidence": 0.0
        }
    
    return {"intelligence_report": report}
