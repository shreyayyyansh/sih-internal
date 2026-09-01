from typing import Optional, TypedDict, Dict, Literal, Union
from pydantic import BaseModel, Field
from enum import Enum


class SeverityLevel(str, Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class ReportStatus(str, Enum):
    INITIATED = "INITIATED"
    VERIFIED  = "VERIFIED"
    ASSIGNED  = "ASSIGNED"
    RESOLVED  = "RESOLVED"
    REJECTED  = "REJECTED"


class ReportCategory(str, Enum):
    WATER          = "WATER"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    WASTE          = "WASTE"
    ELECTRICITY    = "ELECTRICITY"
    UNCERTAIN      = "UNCERTAIN"


class AgentAnalysis(BaseModel):
    confidence: float = Field(description="Confidence score 0.0 to 1.0")
    severity:   SeverityLevel
    reasoning:  str
    title:      str


class Location(BaseModel):
    lat: float
    lng: float


class AgentState(TypedDict):
    # Input fields
    userId:      str
    email:       str
    imageUrl:    str
    location:    Union[Location, Dict]   # accepts both Pydantic and dict
    address:     str
    description: str
    geohash:     str
    status:      ReportStatus

    # Preflight fields (new)
    preflight_passed:           Optional[bool]
    preflight_hint:             Optional[str]
    preflight_rejection_reason: Optional[str]

    # Per-agent analysis
    water_analysis:    Optional[AgentAnalysis]
    waste_analysis:    Optional[AgentAnalysis]
    infra_analysis:    Optional[AgentAnalysis]
    electric_analysis: Optional[AgentAnalysis]
    uncertain_analysis: Optional[AgentAnalysis]

    # Judge output
    aiAnalysis:        Optional[str]
    severity:          Optional[SeverityLevel]
    assigned_category: Optional[ReportCategory]
    title:             Optional[str]
    route:             str
    updatedRoute:      str

    # Locality check
    tool:              Literal["SAVE", "UPDATE"]
    locality_imageUrl: Optional[str]
    locality_email:    Optional[str]
    locality_userId:   Optional[str]
    locality_reportId: Optional[str]

    # Output
    reportId: Optional[str]