import os
import asyncio
from typing import Literal

import httpx
from google import genai
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from datetime import datetime, timezone
from langgraph.graph import StateGraph, START, END
from brain.civicconnect.state import AgentState

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
DUPLICATE_RADIUS_M = int(os.getenv("DUPLICATE_RADIUS_M", "6"))
REQUEST_TIMEOUT = 12  # seconds

if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found!")

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


# ── Image download (async, concurrent) ────────────────────────────────────────
async def _download_image_async(url: str, client: httpx.AsyncClient) -> Image.Image | None:
    """Download an image from a URL asynchronously."""
    if not url:
        return None
    try:
        response = await client.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"  ⚠ Failed to download image from {url}: {e}")
        return None


async def verify_image_similarity_async(new_url: str, existing_url: str) -> bool:
    """
    Downloads both images concurrently, then asks Gemini whether they show the
    EXACT same incident (same location + same problem).
    """
    if not new_url or not existing_url:
        return False
    try:
        async with httpx.AsyncClient() as http_client:
            img_new, img_existing = await asyncio.gather(
                _download_image_async(new_url, http_client),
                _download_image_async(existing_url, http_client),
            )

        if not img_new or not img_existing:
            return False

        prompt = (
            "You are a civic survey analyst comparing two field photos.\n"
            "Image 1: New citizen report.\n"
            "Image 2: Existing database record.\n\n"
            "Do these two photos depict the EXACT SAME specific incident "
            "(same location, same problem, not just same category)?\n"
            "Ignore lighting differences and minor angle changes.\n"
            "Respond with ONLY the word TRUE or FALSE."
        )
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt, img_new, img_existing]
        )
        result = response.text.strip().upper()
        print(f"  Visual similarity result: {result}")
        return "TRUE" in result

    except Exception as e:
        print(f"  ⚠ Image similarity check failed: {e}")
        return False


# ── Locality check node ────────────────────────────────────────────────────────
CATEGORY_ENDPOINTS = {
    "WATER":          "/api/locality/waterCheck",
    "INFRASTRUCTURE": "/api/locality/infraCheck",
    "WASTE":          "/api/locality/wasteCheck",
    "ELECTRICITY":    "/api/locality/electricityCheck",
}


async def locality_check_agent(state: AgentState) -> dict:
    """
    Queries backend for nearby reports using Geohash proximity.
    If a duplicate is found, triggers visual verification.
    """
    print("📍 Locality check...")
    category = state.get("assigned_category")
    cat_str = str(category).split('.')[-1].upper() if category else ""
    endpoint_path = CATEGORY_ENDPOINTS.get(cat_str)

    if not endpoint_path:
        print(f"  No endpoint for category '{cat_str}' — defaulting to SAVE")
        return {"tool": "SAVE"}

    # ── Fix: handle both dict and Pydantic Location ────────────────────────────
    loc = state.get("location")
    if hasattr(loc, "dict"):
        location_data = loc.dict()
    elif isinstance(loc, dict):
        location_data = loc
    else:
        print("  ⚠ Invalid location format — defaulting to SAVE")
        return {"tool": "SAVE"}

    try:
        url = f"{BACKEND_URL.rstrip('/')}{endpoint_path}"
        payload = {
            "location": location_data,
            "geohash":  state.get("geohash"),
            "userId":   state.get("userId"),
        }

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        print(f"  Backend response: duplicateFound={data.get('duplicateFound')}")

        if data.get("duplicateFound") is True:
            report_data = data.get("data", {})
            existing_url = report_data.get("imageUrl")
            current_url  = state.get("imageUrl")

            is_self_duplicate = report_data.get("isSelfDuplicate", False)

            is_same = await verify_image_similarity_async(current_url, existing_url)

            if is_same:
                if is_self_duplicate:
                    print("  ✓ Visual duplicate confirmed + Submitter is same → ALREADY_REPORTED")
                    return {
                        "tool":              "ALREADY_REPORTED",
                        "locality_imageUrl": existing_url,
                        "locality_userId":   report_data.get("userId"),
                        "locality_email":    report_data.get("locality_email"),
                        "locality_reportId": report_data.get("reportId"),
                    }
                else:
                    print("  ✓ Visual duplicate confirmed → UPDATE")
                    return {
                        "tool":              "UPDATE",
                        "locality_imageUrl": existing_url,
                        "locality_userId":   report_data.get("userId"),
                        "locality_email":    report_data.get("locality_email"),
                        "locality_reportId": report_data.get("reportId"),
                    }
            else:
                print("  ✗ Visual check says different incident → SAVE")

        return {
            "tool":              "SAVE",
            "locality_imageUrl": None,
            "locality_userId":   None,
            "locality_email":    None,
            "locality_reportId": None,
        }

    except Exception as e:
        print(f"  ⚠ Locality check failed: {e} — defaulting to SAVE")
        return {"tool": "SAVE"}


# ── Save / Update nodes ────────────────────────────────────────────────────────
async def save_report_tool(state: AgentState) -> dict:
    """Creates a NEW report in the backend database."""
    print("💾 Saving new report...")
    route = state.get("route")
    if not route:
        return {"status": "FAILED"}

    base = BACKEND_URL.rstrip("/")
    path = route.lstrip("/")
    url  = f"{base}/api/{path}" if not path.startswith("api/") else f"{base}/{path}"
    print(f"  → POST {url}")

    category = state.get("assigned_category")
    cat_str = str(category).split('.')[-1].upper() if category else "UNCERTAIN"
    analysis_map = {
        "WATER":          state.get("water_analysis"),
        "WASTE":          state.get("waste_analysis"),
        "INFRASTRUCTURE": state.get("infra_analysis"),
        "ELECTRICITY":    state.get("electric_analysis"),
        "UNCERTAIN":      state.get("uncertain_analysis"),
    }
    current_analysis = analysis_map.get(cat_str)
    current_time = datetime.now(timezone.utc).isoformat()

    loc = state.get("location")
    location_data = loc.dict() if hasattr(loc, "dict") else (loc or {})

    payload = {
        "userId":           state.get("userId"),
        "email":            state.get("email"),
        "imageUrl":         state.get("imageUrl"),
        "location":         location_data,
        "geohash":          state.get("geohash"),
        "description":      state.get("description"),
        "address":          state.get("address"),
        "severity":         current_analysis.severity   if current_analysis else "MEDIUM",
        "confidence":       current_analysis.confidence if current_analysis else 0.0,
        "aiAnalysis":       state.get("aiAnalysis") or (current_analysis.reasoning if current_analysis else ""),
        "title":            state.get("title") or (current_analysis.title if current_analysis else "Untitled"),
        "status":           "VERIFIED",
        "upvotes":          0,
        "downvotes":        0,
        "createdAt":        current_time,
        "updatedAt":        current_time,
        "interests":        [],
        "assigned_category": cat_str,
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        report_id = data.get("reportId") or data.get("id")
        print(f"  ✓ Report saved: {report_id}")

        # UrbanConnect Integration (Option 3)
        # Combine the original payload with the assigned reportId
        try:
            import asyncio
            syndicate_payload = payload.copy()
            syndicate_payload["reportId"] = report_id
            
            async def fire_syndication():
                try:
                    sync_url = f"{base}/api/urbanconnect/syndicate-civic"
                    async with httpx.AsyncClient(timeout=5) as sc:
                        await sc.post(sync_url, json=syndicate_payload)
                        print(f"  ✓ Syndication queued for {report_id}")
                except Exception as sync_e:
                    print(f"  ✗ Syndication trigger failed silently: {sync_e}")
            
            asyncio.create_task(fire_syndication())
        except Exception as e:
            print(f"  ✗ Syndication wrapper failed silently: {e}")

        return {"status": "VERIFIED", "reportId": report_id}
    except Exception as e:
        print(f"  ✗ Save failed: {e}")
        return {"status": "FAILED"}


async def update_report_tool(state: AgentState) -> dict:
    """Updates an EXISTING report (merges upvote + interests)."""
    print("🔄 Updating existing report...")
    route = state.get("updatedRoute")
    if not route:
        return {"status": "FAILED"}

    base = BACKEND_URL.rstrip("/")
    path = route.lstrip("/")
    url  = f"{base}/api/{path}" if not path.startswith("api/") else f"{base}/{path}"

    payload = {
        "email":    state.get("locality_email"),
        "userId":   state.get("locality_userId"),
        "reportId": state.get("locality_reportId"),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "geohash":  state.get("geohash"),
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        report_id = data.get("reportId") or data.get("id")
        print(f"  ✓ Report updated: {report_id}")
        return {"status": "VERIFIED", "reportId": report_id}
    except Exception as e:
        print(f"  ✗ Update failed: {e}")
        return {"status": "FAILED"}


# ── Router ─────────────────────────────────────────────────────────────────────
def route_locality(state: AgentState):
    tool = state.get("tool")
    if tool == "ALREADY_REPORTED":
        return END
    return "update_report_tool" if tool == "UPDATE" else "save_report_tool"


# ── Subgraph assembly ──────────────────────────────────────────────────────────
locality_builder = StateGraph(AgentState)

locality_builder.add_node("locality_check",    locality_check_agent)
locality_builder.add_node("save_report_tool",  save_report_tool)
locality_builder.add_node("update_report_tool", update_report_tool)

locality_builder.add_edge(START, "locality_check")
locality_builder.add_conditional_edges(
    "locality_check",
    route_locality,
    {
        "save_report_tool":   "save_report_tool",
        "update_report_tool": "update_report_tool",
        END: END,
    },
)
locality_builder.add_edge("save_report_tool",   END)
locality_builder.add_edge("update_report_tool", END)

locality_submission_graph = locality_builder.compile()