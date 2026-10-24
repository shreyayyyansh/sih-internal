import os
from jose import jwt
import requests
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --- LANGGRAPH IMPORTS ---
from brain.layel_1 import app_graph, FrontendMessage
from brain.layel_2 import surveillance_agent
from brain.agent3 import analyze_emergency
from brain.resolveWasteAgent import workflow
from brain.safety_agent import safety_app
from brain.urbanconnect.orchestrator import civic_analysis_workflow
from brain.voice_analysis_agent import voice_analysis_app

from brain.civicconnect.orchestrator import app as report_agent
from brain.civicconnect.state import ReportCategory, ReportStatus
from brain.streetgig.job_agent import app as job_agent_workflow
from brain.gee.orchestrator import intelligence_orchestrator
from brain.gee.correlation_agent import run_deep_correlation
# --- GRAPH RAG IMPORTS ---
from brain.streetgig.skill_graph_agent import extract_skills, upsert_skill_nodes
from brain.streetgig.graph_retrieval_agent import get_candidate_pool
from brain.streetgig.graph_scorer import compute_final_score, reputation_score
from brain.streetgig.graph_writebacks import write_job_completion, write_safety_flag
from brain.streetgig.trajectory_agent import get_skill_trajectory, apply_trajectory_boost
from brain.streetgig.context_reranker import contextual_rerank
from motor.motor_asyncio import AsyncIOMotorClient

# --- VYOM AI IMPORT ---
from brain.vyomai.agent import vyom_agent

from brain.urbanconnect.scrapper.orchestrator import fetch_and_analyze_city_pulse_graph


app = FastAPI()
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")  # e.g. dev-xyz.us.auth0.com
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]

# --- MONGODB CONNECTION ---
MONGO_URI = os.getenv("MONGODB_URI", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "uncluttered")
mongo_client = None
mongo_db = None

@app.on_event("startup")
async def startup_db():
    global mongo_client, mongo_db
    if MONGO_URI:
        import certifi
        mongo_client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
        mongo_db = mongo_client[MONGO_DB_NAME]
        print(f"✅ Connected to MongoDB: {MONGO_DB_NAME}", flush=True)
    else:
        print("⚠️ MONGODB_URI not set — graph endpoints will not work", flush=True)

@app.on_event("shutdown")
async def shutdown_db():
    global mongo_client
    if mongo_client:
        mongo_client.close()

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST SCHEMAS ---
class ChatRequest(BaseModel):
    roomId: str
    messages: List[FrontendMessage]
    currentUserMessage: str
    currentUserId: str

class RouteBatchRequest(BaseModel):
    payload: Dict[str, List[float]]

class ThrottleRequest(BaseModel):
    userId: str
    routeId: str
    message: List[FrontendMessage] 

class JobProcessRequest(BaseModel):
    jobId: str
    description: Optional[str] = ""
    category: str
    location: str
    amount: float
    time: str

class LocationModel(BaseModel):
    lat: float
    lng: float

class EmbedRequest(BaseModel):
    text: str

class ReportRequest(BaseModel):
    imageUrl: str
    description: Optional[str] = ""
    location: LocationModel
    address: str
    status: str
    geohash: str
class WasteReportRequest(BaseModel):
    imageUrl:str
    staffimageUrl:str

class SafetyAnalysisRequest(BaseModel):
    reportId: str
    description: str
    chatLogs: List[str]

class CivicAnalysisRequest(BaseModel):
    postId: str
    title: str
    description: str
    imageUrls: List[str] = []
    city: str = ""

class ClusterSummarizeRequest(BaseModel):
    clusterId: str
    postsText: List[str]

class VoiceAnalysisRequest(BaseModel):
    audioUrl: str
    alertId: str
    userId: Optional[str] = ""
    userName: Optional[str] = ""

class PulseRequest(BaseModel):
    city: str
    posts: List[Dict[str, Any]]
    previous_data: Optional[Dict[str, Any]] = None

# --- GEOSCOPE AI SCHEMAS ---
class GeoIntelligenceRequest(BaseModel):
    module_type: str
    region_id: str
    summary_stats: Dict[str, Any]
    image_url: Optional[str] = None
    historical_reports: List[Dict[str, Any]] = []

class GeoCorrelationRequest(BaseModel):
    primary_module: str
    primary_stats: Dict[str, Any]
    secondary_results: List[Dict[str, Any]]

# --- GRAPH RAG REQUEST SCHEMAS ---
class GraphMatchRequest(BaseModel):
    job_id: str
    job_description: str
    job_skill_ids: List[str]
    employer_id: str
    lat: float
    lng: float
    radius_km: float = 10.0

class GraphWritebackRequest(BaseModel):
    worker_id: str
    employer_id: str
    job_id: str
    skill_ids: List[str]
    rating: float

class SafetyFlagRequest(BaseModel):
    worker_id: str
    employer_id: str
    severity: str
    job_id: str

class ExtractSkillsRequest(BaseModel):
    worker_id: str
    text: str

def fetch_user_profile(access_token: str):
    url = f"https://{AUTH0_DOMAIN}/userinfo"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to fetch user profile")

    return response.json()
def get_user_from_token(authorization: str = Header(...)):
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid auth header")

        token = authorization.split(" ")[1]

        # Fetch Auth0 public keys
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()

        unverified_header = jwt.get_unverified_header(token)

        rsa_key = None
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }

        if rsa_key is None:
            raise HTTPException(status_code=401, detail="Invalid token key")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        profile = fetch_user_profile(token)
        return {
            "userId": payload["sub"],      # auth0|xxxxx
            "email": profile.get("email"),
        }

    except Exception as e:
        print("Auth error:", e, flush=True)
        raise HTTPException(status_code=401, detail="Unauthorized")

# --- ENDPOINTS ---
@app.post("/process-job")
async def process_job(req: JobProcessRequest):
    try:
        initial_state = {
            "job_id": req.jobId,
            "description": req.description,
            "category": req.category,
            "location": req.location,
            "amount": req.amount,
            "time": req.time
        }
        
        final_state = await job_agent_workflow.ainvoke(initial_state)
        
        return {
            "status": "success",
            "enriched_description": final_state.get("enriched_description"),
            "job_embedding": final_state.get("job_embedding"),
            "feedback_form": [q for q in final_state.get("feedback_form", [])],
            "extracted_skills": final_state.get("extracted_skills").dict() if final_state.get("extracted_skills") else None
        }
    except Exception as e:
        print(f"Error in Process Job Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed")
async def generate_embedding_endpoint(req: EmbedRequest):
    try:
        print("request hitted in main.py", flush=True)
        from brain.embedding_agent import generate_embedding
        vector = await generate_embedding(req.text)
        return {
            "status": "success",
            "embedding": vector
        }
    except Exception as e:
        print(f"Error in embed endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/resolveWasteReports")
async def resolve_waste_report(req: WasteReportRequest):
    try:
        initial_report_state = {
            "imageUrl": req.imageUrl,
            "staffimageUrl": req.staffimageUrl,
        }
        print(f"Initial State: {initial_report_state}", flush=True)
        final_state = await workflow.ainvoke(initial_report_state)
        confidence_data = final_state.get("confidence_result")

        if not confidence_data:
            raise HTTPException(status_code=500, detail="Analysis completed but no result returned.")
        return {
            "success": True,
            "confidence_result": confidence_data.model_dump()
        }
    except Exception as e:
        print(f"Error in Report Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Orchestration Failed: {str(e)}")
"""
main.py — IMPROVED /reports endpoint
Changes:
  - Initialises preflight fields to None in state
  - Handles REJECTED status from preflight with a 422 response
  - Cleaner title extraction
"""

# ... (other imports unchanged — include all existing imports from your main.py)

from brain.civicconnect.orchestrator import app as report_agent
from brain.civicconnect.state import ReportCategory, ReportStatus

# ── /reports endpoint (only showing the changed portion) ──────────────────────
@app.post("/reports")
async def create_report(
    req: ReportRequest,
    user_info: dict = Depends(get_user_from_token)
):
    try:
        secure_user_id = user_info["userId"]
        secure_email   = user_info["email"]
        print(f"--- Processing report from: {secure_email} ---", flush=True)

        initial_state = {
            # Auth
            "userId":  secure_user_id,
            "email":   secure_email,

            # Report data
            "imageUrl":    req.imageUrl,
            "description": req.description,
            "location":    {"lat": req.location.lat, "lng": req.location.lng},
            "geohash":     req.geohash,
            "address":     req.address,
            "status":      req.status,

            # Preflight fields (initialised to None — populated by preflight_node)
            "preflight_passed":           None,
            "preflight_hint":             None,
            "preflight_rejection_reason": None,

            # Locality fields
            "locality_imageUrl": None,
            "locality_email":    None,
            "locality_userId":   None,
            "locality_reportId": None,

            # Decision fields
            "tool":            "SAVE",
            "water_analysis":  None,
            "waste_analysis":  None,
            "infra_analysis":  None,
            "electric_analysis":  None,
            "uncertain_analysis": None,
            "aiAnalysis":        None,
            "severity":          None,
            "assigned_category": None,
            "title":             None,
            "route":             "",
            "updatedRoute":      "",
            "reportId":          None,
        }

        result = await report_agent.ainvoke(initial_state)

        # ── Handle preflight rejection ─────────────────────────────────────────
        if result.get("status") == "REJECTED":
            return JSONResponse(
                status_code=422,
                content={
                    "status":  "REJECTED",
                    "message": result.get("aiAnalysis", "Image not relevant to civic issues"),
                }
            )

        category      = result.get("assigned_category")
        extracted_title = result.get("title") or "Report Processed"
        tool          = result.get("tool")

        if result.get("reportId"):
            return {
                "status":      "success",
                "message":     "Report processed successfully",
                "reportId":    result.get("reportId"),
                "category":    str(category) if category else None,
                "title":       extracted_title,
                "severity":    str(result.get("severity")) if result.get("severity") else None,
                "ai_analysis": result.get("aiAnalysis"),
                "tool":        tool,
            }
        else:
            return {
                "status":      "partial_success",
                "message":     "Analysis complete but save may have failed.",
                "category":    str(category) if category else None,
                "ai_analysis": result.get("aiAnalysis"),
            }

    except Exception as e:
        print(f"Error in /reports: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Orchestration failed: {str(e)}")

@app.post("/analyze-safety")
async def analyze_chat_safety(req: SafetyAnalysisRequest):
    try:
        initial_state = {
            "reportId": req.reportId,
            "description": req.description,
            "chatLogs": req.chatLogs
        }
        
        final_state = await safety_app.ainvoke(initial_state)
        result = final_state.get("analysis_result")
        
        return {
            "status": "success",
            "severity": result.severity,
            "summary": result.summary
        }
    except Exception as e:
        print(f"Error in analyze-safety endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agent1")
async def chat_endpoint(req: ChatRequest):
    try:
        initial_state = {
            "roomId": req.roomId,
            "messages": req.messages,
            "currentUserMessage": req.currentUserMessage,
            "currentUserId": req.currentUserId
        }
        config = {"configurable": {"thread_id": req.roomId}}
        
        # Invoke the LangGraph agent
        final_state = await app_graph.ainvoke(initial_state, config=config)
        decision = final_state["final_model_score"]
        
        return {
            "status": "success",
            "final_score": decision.final_safety_score,
            "trigger_sos": decision.trigger_sos, 
            "sos_context": decision.sos_context,
            "analysis": decision.reason,
            "details": {
                "sentiment": final_state.get("model_1"),
                "urgency": final_state.get("model_2"),
                "severity": final_state.get("model_3")
            }
        }
    except Exception as e:
        print(f"Error in Chat Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/throttle")
async def throttle_push(req: ThrottleRequest):
    try:
        initial_state = {
            "userId": req.userId,
            "routeId": req.routeId,
            "message": req.message, 
            "context": None          
        }
        result = await analyze_emergency.ainvoke(initial_state)  
        final_msg = result.get("context", "No analysis generated")
        
        return {
            "status": "Emergency Marked",
            "ai_analysis": final_msg
        }
    except Exception as e:
        print(f"Error in throttle agent: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

class SkillGapRequest(BaseModel):
    questions: List[str]
    ratings: List[int]
    pairedQuestions: Optional[List[Dict]] = None

@app.post("/process-skill-gap")
async def process_skill_gap(req: SkillGapRequest):
    try:
        from brain.streetgig.skill_gap_agent import workflow as skill_gap_workflow
        
        initial_state = {
            "questions": req.questions,
            "ratings": req.ratings,
            "pairedQuestions": req.pairedQuestions or []
        }
        
        final_state = await skill_gap_workflow.ainvoke(initial_state)
        
        return {
            "status": "success",
            "skill_gap_string": final_state.get("skill_gap_string"),
            "skill_gap_embeddings": final_state.get("skill_gap_embeddings")
        }
    except Exception as e:
        print(f"Error in Process Skill Gap Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-post")
async def analyze_post(req: CivicAnalysisRequest):
    try:
        initial_state = {
            "post_id": req.postId,
            "title": req.title,
            "description": req.description,
            "image_urls": req.imageUrls,
            "city": req.city
        }

        final_state = await civic_analysis_workflow.ainvoke(initial_state)

        return {
            "status": "success",
            "sentiment": final_state.get("sentiment"),
            "sentiment_score": final_state.get("sentiment_score"),
            "urgency": final_state.get("urgency"),
            "post_type": final_state.get("post_type"),
            "embedding": final_state.get("embedding"),
            "cluster_id": final_state.get("cluster_id"),
            "is_misinformation": final_state.get("is_misinformation"),
            "context_note": final_state.get("context_note")
        }
    except Exception as e:
        print(f"Error in Civic Analysis Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-civic")
async def analyze_civic(req: CivicAnalysisRequest):
    try:
        initial_state = {
            "post_id": req.postId,
            "title": req.title,
            "description": req.description,
            "image_urls": req.imageUrls,
            "city": req.city
        }

        final_state = await civic_analysis_workflow.ainvoke(initial_state)

        return {
            "status": "success",
            "sentiment": final_state.get("sentiment"),
            "sentiment_score": final_state.get("sentiment_score"),
            "urgency": final_state.get("urgency"),
            "post_type": final_state.get("post_type"),
            "embedding": final_state.get("embedding"),
            "cluster_id": final_state.get("cluster_id"),
            "is_misinformation": final_state.get("is_misinformation"),
            "context_note": final_state.get("context_note")
        }
    except Exception as e:
        print(f"Error in analyze-civic Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

class ClusterSummaryResult(BaseModel):
    headline: str = Field(description="A concise 5-word headline summarizing the issue")
    summary: str = Field(description="A clear 2-sentence summary of the emerging crisis or issue")

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
summarizer_llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
cluster_summary_engine = summarizer_llm.with_structured_output(ClusterSummaryResult)

@app.post("/summarize-cluster")
async def summarize_cluster(req: ClusterSummarizeRequest):
    try:
        combined = "\n".join([f"- {t}" for t in req.postsText])
        prompt = f"""Analyze these {len(req.postsText)} related civic posts and summarize the emerging issue.
        
POSTS:
{combined}

Generate a concise 5-word headline and a clear 2-sentence summary of the crisis or issue."""
        result = await cluster_summary_engine.ainvoke([HumanMessage(content=prompt)])
        return {
            "status": "success",
            "headline": result.headline,
            "summary": result.summary
        }
    except Exception as e:
        print(f"Error in Summarize Cluster Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-voice")
async def analyze_voice(req: VoiceAnalysisRequest):
    try:
        initial_state = {
            "audio_url": req.audioUrl,
            "alert_id": req.alertId,
            "user_id": req.userId or "",
            "user_name": req.userName or "Unknown",
        }
        
        final_state = await voice_analysis_app.ainvoke(initial_state)
        result = final_state.get("analysis_result")
        
        if result:
            # Send results back to Node server
            import httpx
            backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
            async with httpx.AsyncClient(timeout=10) as client:
                await client.patch(
                    f"{backend_url}/api/voice/{req.alertId}/analysis",
                    json={
                        "transcript": result.transcript,
                        "urgency": result.urgency,
                        "summary": result.summary,
                        "pattern": result.pattern,
                        "actionItems": result.actionItems,
                    }
                )
        
        return {
            "status": "success",
            "transcript": result.transcript,
            "urgency": result.urgency,
            "summary": result.summary,
            "pattern": result.pattern,
            "actionItems": result.actionItems,
        }
    except Exception as e:
        print(f"Error in analyze-voice endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/analyze-pulse")
async def analyze_pulse_endpoint(req: PulseRequest):
    try:
        # Pass the data into your modular graph
        result = await fetch_and_analyze_city_pulse_graph(
            city=req.city,
            posts=req.posts,
            previous_data=req.previous_data
        )
        return result
    except Exception as e:
        print(f"Error in City Pulse Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


# --- GEOSCOPE ENDPOINTS ---

@app.post("/analyze-geoscope-intelligence")
async def analyze_geoscope_intelligence(req: GeoIntelligenceRequest):
    try:
        print(f"📡 [GEE] Intelligence request received for module: {req.module_type} (Region: {req.region_id})", flush=True)
        initial_state = {
            "module_type": req.module_type,
            "region_id": req.region_id,
            "summary_stats": req.summary_stats,
            "image_url": req.image_url,
            "historical_reports": req.historical_reports
        }
        final_state = await intelligence_orchestrator.ainvoke(initial_state)
        report = final_state.get("intelligence_report")
        
        if not report:
            print(f"❌ [GEE] Intelligence generation failed for {req.region_id}", flush=True)
            raise HTTPException(status_code=500, detail="Intelligence report generation failed.")
            
        print(f"✅ [GEE] Intelligence report generated successfully for {req.region_id}", flush=True)
        return report
    except Exception as e:
        print(f"Error in Geoscope Intelligence Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-geoscope-correlation")
async def analyze_geoscope_correlation(req: GeoCorrelationRequest):
    try:
        print(f"📡 [GEE] Correlation request received for primary: {req.primary_module}", flush=True)
        findings = await run_deep_correlation(
            req.primary_module,
            req.primary_stats,
            req.secondary_results
        )
        print(f"✅ [GEE] Deep correlation complete. Found {len(findings)} composite findings.", flush=True)
        return {"findings": findings}
    except Exception as e:
        print(f"Error in Geoscope Correlation Endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- GRAPH RAG ENDPOINTS ---

@app.post('/graph-match')
async def graph_match(req: GraphMatchRequest):
    '''Full pipeline: graph retrieval → scoring → trajectory → re-rank'''
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected")
    try:
        # Step 1: Graph retrieval
        candidates = await get_candidate_pool(
            req.job_skill_ids, req.employer_id,
            req.lat, req.lng, req.radius_km, mongo_db
        )

        if not candidates:
            return {'status': 'success', 'candidates': []}

        # Fetch safety flags for all candidate workers
        candidate_ids = [c['worker_id'] for c in candidates]
        safety_flags = await mongo_db.graph_edges.find({
            'from_id': {'$in': candidate_ids},
            'relationship': 'trust_flag'
        }).to_list(length=200)

        # Get average skill node rating for cold-start fallback
        skill_nodes = await mongo_db.skill_nodes.find(
            {'skill_id': {'$in': req.job_skill_ids}}
        ).to_list(length=50)
        avg_skill_rating = sum(n.get('avg_rating', 3.0) for n in skill_nodes) / max(len(skill_nodes), 1)

        # Step 2: Score each candidate
        for c in candidates:
            rep = reputation_score(c['worker_id'], candidates, avg_skill_rating)
            base_score = compute_final_score(
                vector_sim=c.get('graph_score', 0.5),
                graph_score=c.get('graph_score', 0),
                rep_score=rep,
                last_active=c.get('last_active'),
                worker_id=c['worker_id'],
                safety_flags=safety_flags,
            )
            # Get trajectory for primary matched skill
            primary_skill = c['matched_skills'][0] if c.get('matched_skills') else None
            if primary_skill:
                trajectory = await get_skill_trajectory(c['worker_id'], primary_skill, mongo_db)
            else:
                trajectory = {'ewa_score': 0, 'raw_avg': 0, 'trend': 'insufficient_data'}

            c['final_score'] = apply_trajectory_boost(
                base_score, trajectory['trend'], trajectory['ewa_score'], trajectory['raw_avg']
            )
            c['trend']     = trajectory['trend']
            c['ewa_score'] = trajectory['ewa_score']

        # Step 3: Sort and contextual re-rank
        candidates.sort(key=lambda x: x['final_score'], reverse=True)
        ranked = await contextual_rerank(req.job_description, req.job_skill_ids, candidates)

        return {'status': 'success', 'candidates': [r.dict() for r in ranked]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/graph-writeback')
async def graph_writeback(req: GraphWritebackRequest):
    '''Call on every job close. Keeps the graph current.'''
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected")
    try:
        await write_job_completion(
            req.worker_id, req.employer_id, req.job_id,
            req.skill_ids, req.rating, mongo_db
        )
        return {'status': 'success'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/graph-safety-flag')
async def graph_safety_flag_endpoint(req: SafetyFlagRequest):
    '''Write a safety trust_flag edge. Called by safety_agent when severity >= HIGH.'''
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected")
    try:
        await write_safety_flag(
            req.worker_id, req.employer_id, req.severity, req.job_id, mongo_db
        )
        return {'status': 'success'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/graph-extract-skills')
async def extract_worker_skills(req: ExtractSkillsRequest):
    '''Extract skills from worker profile text and write has_skill edges.'''
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected")
    try:
        result = await extract_skills(req.text)
        skill_ids = await upsert_skill_nodes(result.skills, mongo_db.skill_nodes)
        # Write has_skill edges for each extracted skill
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for skill_id in skill_ids:
            await mongo_db.graph_edges.update_one(
                {'from_id': req.worker_id, 'to_id': skill_id, 'relationship': 'has_skill'},
                {'$set': {'from_type': 'worker', 'to_type': 'skill', 'weight': 0, 'updated_at': now},
                 '$setOnInsert': {'created_at': now}},
                upsert=True
            )
        return {'status': 'success', 'skill_ids': skill_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# VYOM AI — Voice Assistant Endpoint
# ═══════════════════════════════════════════════════════════════════════

class AssistantChatRequest(BaseModel):
    text: str
    sessionId: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    pendingIntent: Optional[str] = None
    collectedData: Optional[Dict] = None
    location: Optional[Dict] = None

@app.post('/assistant-chat')
async def assistant_chat(
    req: AssistantChatRequest,
    authorization: Optional[str] = Header(None),
):
    '''Vyom AI voice assistant endpoint. Called by the Node.js proxy.'''
    from uuid import uuid4

    # Extract user_id from the forwarded token
    user_id = ""
    token = authorization or ""
    if token.startswith("Bearer "):
        try:
            raw_token = token.split(" ")[1]
            jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
            jwks = requests.get(jwks_url).json()
            unverified = jwt.get_unverified_header(raw_token)
            rsa_key = {}
            for key in jwks["keys"]:
                if key["kid"] == unverified.get("kid"):
                    rsa_key = {"kty": key["kty"], "kid": key["kid"], "use": key["use"], "n": key["n"], "e": key["e"]}
            if rsa_key:
                payload = jwt.decode(raw_token, rsa_key, algorithms=ALGORITHMS, audience=AUTH0_AUDIENCE, issuer=f"https://{AUTH0_DOMAIN}/")
                user_id = payload.get("sub", "")
        except Exception as e:
            print(f"[Vyom AI] Auth warning (non-fatal): {e}", flush=True)

    session_id = req.sessionId or str(uuid4())

    try:
        collected_data = req.collectedData or {}
        if req.location:
            collected_data['location'] = req.location

        result = await vyom_agent.ainvoke({
            'user_id': user_id,
            'session_id': session_id,
            'current_message': req.text,
            'messages': req.messages or [],
            'pending_intent': req.pendingIntent,
            'collected_data': collected_data,
            '_token': token,
        })

        return {
            'reply': result.get('response', 'Sorry, I could not process that.'),
            'action': result.get('action'),
            'sessionId': session_id,
            'pendingIntent': result.get('pending_intent'),
            'collectedData': result.get('collected_data'),
        }
    except Exception as e:
        print(f"[Vyom AI] Error: {e}", flush=True)
        return {
            'reply': 'Sorry, the assistant encountered an error. Please try again.',
            'sessionId': session_id,
        }