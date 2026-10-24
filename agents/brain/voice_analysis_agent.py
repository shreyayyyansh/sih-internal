import os
import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()

import httpx
import base64
from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

# --- Output Schema ---
class VoiceAnalysisResult(BaseModel):
    transcript: str = Field(description="Full transcription of the audio recording")
    urgency: str = Field(description="Must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL")
    summary: str = Field(description="A 2-3 sentence SOS context summary explaining what is happening and the distress level")
    pattern: str = Field(description="Cross-alert pattern analysis: escalation trend, repeated distress, or 'First alert' if no prior history")
    actionItems: List[str] = Field(description="2-4 specific recommended actions for the admin to take immediately")

# --- Graph State ---
class VoiceAnalysisState(TypedDict):
    audio_url: str
    alert_id: str
    user_id: str
    user_name: str
    memory: Optional[List[dict]]
    analysis_result: Optional[VoiceAnalysisResult]

# --- Node 1: Fetch Memory (prior alerts for this user) ---
async def fetch_memory_node(state: VoiceAnalysisState):
    user_id = state.get("user_id", "")
    if not user_id:
        return {"memory": []}
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(f"{BACKEND_URL}/api/voice/history/{user_id}")
            if res.status_code == 200:
                history = res.json().get("alerts", [])
                # Keep only last 5 alerts with analysis
                recent = [a for a in history if a.get("analysis")][:5]
                return {"memory": recent}
    except Exception as e:
        print(f"[Memory] Failed to fetch history: {e}")
    
    return {"memory": []}

# --- Node 2: Analyze Audio with Memory Context ---
SYSTEM_PROMPT = """You are an emergency SOS audio analyst for a women's safety platform called SisterHood.
You will receive an audio recording from a user who may be in distress.

Your job is to:
1. TRANSCRIBE the audio accurately, capturing every word
2. ASSESS the urgency level:
   - LOW: Calm voice, testing features, no real distress
   - MEDIUM: Mildly concerned, reporting a past incident, requesting info
   - HIGH: Audible fear/distress, calling for help, describing an active threat
   - CRITICAL: Screaming, crying, sounds of violence/struggle, immediate danger
3. SUMMARIZE the situation in 2-3 sentences for an emergency responder
4. ANALYZE PATTERNS across the user's alert history (provided below) — is the situation escalating? Repeated distress? New vs returning user?
5. RECOMMEND 2-4 specific ACTION ITEMS for administration (e.g., "Dispatch patrol to coordinates", "Contact user via call", "Flag for follow-up", "Escalate to law enforcement")

If the audio is unclear, silent, or contains no speech, set urgency to LOW and note it in the summary.
"""

def _build_memory_context(memory: list, user_name: str) -> str:
    if not memory:
        return f"\n--- ALERT HISTORY FOR {user_name} ---\nNo prior alerts on record. This is the user's FIRST SOS recording.\n"
    
    lines = [f"\n--- ALERT HISTORY FOR {user_name} (last {len(memory)} alerts) ---"]
    for i, alert in enumerate(memory, 1):
        a = alert.get("analysis", {})
        lines.append(
            f"{i}. [{a.get('urgency', '?')}] {a.get('summary', 'No summary')} "
            f"(recorded {alert.get('timestamp', 'unknown time')})"
        )
    lines.append("--- END HISTORY ---\n")
    return "\n".join(lines)

def _get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.1,
        google_api_key=os.getenv("GOOGLE_API_KEY")
    ).with_structured_output(VoiceAnalysisResult)

async def analyze_voice_node(state: VoiceAnalysisState):
    audio_url = state["audio_url"]
    memory = state.get("memory", [])
    user_name = state.get("user_name", "Unknown User")
    
    # Download audio from Cloudinary
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(audio_url)
        response.raise_for_status()
        audio_bytes = response.content
    
    # Determine MIME type from URL
    mime_type = "audio/mp4"
    if audio_url.endswith(".webm"):
        mime_type = "audio/webm"
    elif audio_url.endswith(".wav"):
        mime_type = "audio/wav"
    elif audio_url.endswith(".mp3"):
        mime_type = "audio/mpeg"
    
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    memory_context = _build_memory_context(memory, user_name)
    
    llm = _get_llm()
    
    prompt_text = SYSTEM_PROMPT + memory_context + "\nAnalyze the following audio recording:"
    
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt_text},
            {
                "type": "media",
                "mime_type": mime_type,
                "data": audio_b64,
            },
        ]
    )
    
    result: VoiceAnalysisResult = await llm.ainvoke([message])
    
    return {"analysis_result": result}

# --- Build LangGraph ---
workflow = StateGraph(VoiceAnalysisState)
workflow.add_node("fetch_memory", fetch_memory_node)
workflow.add_node("analyze", analyze_voice_node)

workflow.set_entry_point("fetch_memory")
workflow.add_edge("fetch_memory", "analyze")
workflow.add_edge("analyze", END)

voice_analysis_app = workflow.compile()
