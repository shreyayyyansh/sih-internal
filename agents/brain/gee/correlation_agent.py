import json
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

class CompositeFindingModel(BaseModel):
    related_module: str = Field(description="The secondary module being correlated (e.g., 'surface_heat', 'air_quality_co', 'deforestation')")
    correlation_type: str = Field(description="A short 3-5 word title for the observed linkage (e.g., 'Compounding Drought Heat Index')")
    description: str = Field(description="A detailed 2-3 sentence explanation of HOW the primary scan metrics interact with the secondary scan metrics to magnify environmental risk. You MUST explicitly reference the quantitative metrics/parameters from the data (e.g., specific CO levels, temperature variance, deforestation area) to justify your reasoning.")
    risk_level: str = Field(description="Must be exactly one of: 'LOW', 'MODERATE', 'HIGH', or 'CRITICAL'")

class CorrelationResponseModel(BaseModel):
    findings: List[CompositeFindingModel] = Field(description="A list of composite finding insights based on the cross-module data")

async def run_deep_correlation(primary_module: str, primary_stats: Dict[str, Any], secondary_results: List[Dict[str, Any]]) -> List[Dict]:
    if not secondary_results:
        return []
        
    prompt = f"""You are GeoScope AI, an expert in cross-module environmental correlation.

    Analyze the relationship between the Primary observation and the Secondary tracking data to identify compound risks.
    
    PRIMARY MODULE: {primary_module.upper()}
    PRIMARY METRICS:
    {json.dumps(primary_stats, indent=2, default=str)}
    
    SECONDARY PARALLEL SCANS:
    {json.dumps(secondary_results, indent=2, default=str)}
    
    Provide an in-depth spatial correlation analysis. Identify exactly how these variables interact in the natural environment. Extrapolate compound risks based on these multi-variable metrics.
    Output a structured list of findings."""

    try:
        model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.2)
        structured_model = model.with_structured_output(CorrelationResponseModel)
        
        print(f"🔗 [Correlation] Reasoning across {len(secondary_results)} secondary modules for {primary_module}...", flush=True)
        response = await structured_model.ainvoke([HumanMessage(content=prompt)])
        # Convert pydantic models back to dictionaries matching the expected js format
        print(f"✅ [Correlation] Analysis complete. Generated {len(response.findings)} findings.", flush=True)
        return [finding.dict() for finding in response.findings]
        
    except Exception as e:
        print(f"Deep Correlation Error: {str(e)}", flush=True)
        return [{
            "related_module": "System Error",
            "correlation_type": "Data Pipeline Failure",
            "description": f"Failed to perform deep AI correlation: {str(e)}",
            "risk_level": "UNKNOWN"
        }]
