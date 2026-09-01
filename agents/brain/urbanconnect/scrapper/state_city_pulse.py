from typing import List, Optional, Dict, Any, TypedDict
from pydantic import BaseModel, Field


class ExtractedIssue(BaseModel):
    title: str = Field(description="Short, professional title of the issue")
    description: str = Field(description="Detailed summary of citizen complaints")
    category: str = Field(description="Must be one of: WATER_SUPPLY, ELECTRICITY, ROADS_AND_INFRA, SANITATION_WASTE, PUBLIC_HEALTH, TRAFFIC_TRANSPORT, LAW_AND_ORDER, CORRUPTION_BUREAUCRACY, OTHER")
    locations_mentioned: List[str] = Field(description="Extract any specific neighborhoods/streets.")
    severity_level: str = Field(description="Must be one of: LOW, MEDIUM, HIGH, CRITICAL")
    complaint_volume: int = Field(description="Estimated number of distinct posts talking about this issue.")
    source_urls: List[str] = Field(description="List of raw URLs from the input data")

class SentimentMetrics(BaseModel):
    public_trust_score: float = Field(description="Scale of 0.0 to 10.0.")
    primary_emotion: str = Field(description="The dominant emotion in the data.")
    top_target_authority: Optional[str] = Field(description="Who are they blaming the most today? Return None if no specific authority.")

class TrendAnalysis(BaseModel):
    direction: str = Field(description="Must be one of: IMPROVING, DECLINING, STABLE, or INSUFFICIENT_DATA")
    trust_score_delta: float = Field(description="The mathematical difference (e.g., -1.2). Use 0.0 if no previous data exists.")
    insight: str = Field(description="A 1-sentence explanation of WHY the sentiment changed.")

class CityPulseAnalysis(BaseModel):
    executive_summary: str = Field(description="A 3-4 sentence high-level briefing for the Mayor.")
    sentiment_metrics: SentimentMetrics
    trend_analysis: TrendAnalysis
    extracted_issues: List[ExtractedIssue]
    recommended_actions: List[str] = Field(description="2 to 3 immediate, actionable steps.")


class CityPulseState(TypedDict):
    city: str
    posts: List[Dict[str, Any]]
    previous_data: Optional[Dict[str, Any]]
    final_analysis: Optional[dict] 