import os
import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
from typing import TypedDict, Annotated, Sequence, Any, List
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# --- Define Output Schema ---
class SafetyAnalysisResult(BaseModel):
    severity: str = Field(description="Must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL")
    summary: str = Field(description="A 2-3 sentence summary explaining the context of the report and why this severity was assigned.")

# --- Define Graph State ---
class SafetyState(TypedDict):
    reportId: str
    description: str
    chatLogs: List[str]
    analysis_result: SafetyAnalysisResult | None

def _get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        temperature=0.1,
        google_api_key=os.getenv("GOOGLE_API_KEY")
    ).with_structured_output(SafetyAnalysisResult)

prompt_template = """
You are a Trust & Safety AI auditor for a local gig-economy platform (StreetGig).
Your job is to analyze chat conversations and user reports to determine safety violations.

REPORTING USER'S REASON:
{description}

CHAT LOGS (Chronological):
{chat_logs}

Analyze the interaction and assign a severity tier:
- LOW: Minor disagreement, misunderstanding, or mild spam.
- MEDIUM: Abusive language, unprofessional conduct, attempts to bypass platform fees.
- HIGH: Harassment, threats, highly offensive language, or clear scam attempts.
- CRITICAL: Physical safety threats, illegal activities, or severe harm imminent.

Respond concisely according to the specified schema.
"""

async def analyze_safety_node(state: SafetyState):
    description = state.get("description", "No description provided.")
    chat_logs = state.get("chatLogs", [])
    chat_logs_text = "\n".join(chat_logs) if chat_logs else "No chat history provided."

    llm = _get_llm()
    content = prompt_template.format(description=description, chat_logs=chat_logs_text)
    
    result: SafetyAnalysisResult = await llm.ainvoke([HumanMessage(content=content)])
    
    return {"analysis_result": result}

# --- Build LangGraph ---
workflow = StateGraph(SafetyState)

workflow.add_node("analyze", analyze_safety_node)
workflow.set_entry_point("analyze")
workflow.add_edge("analyze", END)

safety_app = workflow.compile()
