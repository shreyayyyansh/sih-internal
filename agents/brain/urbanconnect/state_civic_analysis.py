from typing import TypedDict, Optional, List
from pydantic import BaseModel, Field
class TriageResult(BaseModel):
    sentiment: str = Field(description="Must be one of: POSITIVE, NEUTRAL, NEGATIVE, ALARMING")
    sentiment_score: float = Field(description="Float 0.0 to 1.0. 0=Very Negative, 1=Very Positive")
    urgency: str = Field(description="Must be one of: LOW, MEDIUM, HIGH, CRITICAL")
    post_type: str = Field(description="Must be one of: CIVIC_REPORT, POLICY_RUMOR, GENERAL")
    embedding_string: str = Field(description="A dense semantic summary of the text and images for vectorization.")

class FactCheckResult(BaseModel):
    reasoning: str = Field(description="Step-by-step logic comparing the claim to the context before making a decision.")
    is_misinformation: bool = Field(description="TRUE if the claim contradicts official announcements")
    context_note: str = Field(description="A correction note citing the official source, or 'No contradictions found'")
# --- Graph State ---


class CivicAnalysisState(TypedDict, total=False):
    # Inputs
    post_id: str
    title: str
    description: str
    image_urls: List[str]
    city: str
    
    embedding_string: str

    # Node 1 outputs
    sentiment: str
    sentiment_score: float
    urgency: str
    post_type: str

    # Node 2 outputs
    embedding: List[float]
    cluster_id: Optional[str]

    # Node 3 outputs (only for POLICY_RUMOR)
    is_misinformation: Optional[bool]
    context_note: Optional[str]
