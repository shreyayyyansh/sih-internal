import operator
from typing import TypedDict, Annotated, List, Dict, Any, Optional

class GeoIntelligenceState(TypedDict):
    module_type: str
    region_id: str
    summary_stats: Dict[str, Any]
    historical_reports: List[Dict[str, Any]]
    
    # Internal Nodes
    vision_analysis: Optional[str]
    
    # Final Output
    intelligence_report: Optional[Dict[str, Any]]
