"""
CivicConnect tools — reports, complaints, locality checks, announcements.
"""

from brain.vyomai.tools._http import get, post
from brain.vyomai.tools._constants import NAV_PATHS
from datetime import datetime, timezone

# ── Schemas ──────────────────────────────────────────────────────────

SCHEMAS = [
    {
        "name": "list_reports",
        "description": "List the user's recent civic reports/complaints. IMPORTANT: You MUST mention the 'id' of each report in your response so the user can explicitly ask to track it later.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "track_report",
        "description": "Get detailed status and timeline of a user's report. If the user provides an ID, pass it. If they just say 'track my report' or 'track my recent water report', DO NOT ask for an ID — just call this tool and the system will automatically find their most recent report.",
        "parameters": {
            "type": "object",
            "properties": {
                "report_id": {"type": "string", "description":  "Specific report ID if known"},
                "category": {"type": "string", "description": "Type of report (e.g., 'water', 'waste', 'infrastructure', 'electricity') if user mentions it but lacks the ID"},
                "report_index": {"type": "integer", "description": "1-based index (e.g. 1, 2) if the user says 'track the first one' or 'track number 2'"}
            },
            "required": [],
        },
    },
    {
        "name": "check_locality",
        "description": "Check local infrastructure health — water supply, waste, electricity, or infrastructure. REQUIRES: check_type. Ask the user what they want to check if unclear.",
        "parameters": {
            "type": "object",
            "properties": {
                "check_type": {
                    "type": "string",
                    "enum": ["waterCheck", "wasteCheck", "infraCheck", "electricityCheck"],
                    "description": "Type of locality check (REQUIRED)",
                },
            },
            "required": ["check_type"],
        },
    },
    {
        "name": "get_announcements",
        "description": "Fetch latest government/civic announcements. Use when user asks 'any announcements?', 'government news'.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
]


# ── Handlers ─────────────────────────────────────────────────────────

async def list_reports(args: dict, user_id: str, token: str) -> dict:
    try:
        data = await post("/api/reports/fetch3Reports", {}, token)

        # API returns {status, data: {waste: [...], infrastructure: [...], water: [...]}}
        reports = []
        report_data = data.get("data", data) if isinstance(data, dict) else data
        if isinstance(report_data, dict):
            for category, category_reports in report_data.items():
                if isinstance(category_reports, list):
                    for r in category_reports:
                        r["_category"] = category
                        reports.append(r)
        elif isinstance(report_data, list):
            reports = report_data

        if not reports:
            return {
                "tool": "list_reports",
                "message": "You have no reports yet. File a complaint via CivicConnect!",
                "action": {"type": "navigate", "path": NAV_PATHS["CivicConnect"]},
            }
        items = [
            {"id": r.get("id", ""), "title": r.get("title", "Untitled"), "status": r.get("status", "PENDING"), "category": r.get("_category", "")}
            for r in reports[:5]
        ]
        return {
            "tool": "list_reports",
            "reports": items,
            "count": len(items),
            "instructions": "List these out clearly and MUST INCLUDE exactly the `id` field for each so the user can refer back to it for tracking.",
        }
    except Exception as e:
        return {"tool": "list_reports", "error": str(e)}


async def track_report(args: dict, user_id: str, token: str) -> dict:
    report_id = args.get("report_id", "")
    category = args.get("category", "").lower()
    report_index = args.get("report_index")
    
    if not report_id:
        try:
            # Auto-resolve report ID by fetching user's recent reports
            data = await post("/api/reports/fetch3Reports", {}, token)
            report_data = data.get("data", data) if isinstance(data, dict) else data
            
            reports = []
            if isinstance(report_data, dict):
                for cat, category_reports in report_data.items():
                    if isinstance(category_reports, list):
                        for r in category_reports:
                            r["_category"] = cat
                            reports.append(r)
            elif isinstance(report_data, list):
                reports = report_data
                
            if not reports:
                return {
                    "tool": "track_report",
                    "message": "You don't have any recent reports to track. Would you like me to open the CivicConnect portal so you can file one?",
                }
                
            # If category is requested, filter by it
            candidates = reports
            if category:
                # Basic string match
                candidates = [r for r in reports if category in r.get("_category", "").lower()]
                if not candidates:
                    return {
                        "tool": "track_report",
                        "message": f"I couldn't find any recent {category} reports. You have {len(reports)} total recent reports. Which one would you like to track?",
                    }
            
            if report_index is not None and 1 <= report_index <= len(candidates):
                report_id = candidates[report_index - 1].get("id")
            elif len(candidates) > 1:
                # Ask the user to disambiguate by number
                items = []
                for i, r in enumerate(candidates[:5]):
                    title = r.get("title", "Untitled")
                    status = r.get("status", "PENDING")
                    items.append(f"{i+1}. {title} ({status})")
                
                num_text = f"these {len(candidates)} {category + ' ' if category else ''}reports"
                return {
                    "tool": "track_report",
                    "needs_more_info": True,
                    "message": f"I found {num_text}. Which one would you like to track? (e.g., say 'the first one' or 'number 2'):\n" + "\n".join(items),
                }
            else:
                report_id = candidates[0].get("id")
                
            if not report_id:
                return {"tool": "track_report", "error": "Found a recent report but it has no ID."}
                
        except Exception as e:
            return {"tool": "track_report", "error": f"Failed to auto-resolve report ID: {str(e)}"}

    try:
        data = await get(f"/api/track/{report_id}", token)
        return {
            "tool": "track_report",
            "data": data,
            "message": "Here is the tracking information for your report.",
            "action": {"type": "navigate", "path": f"/(main)/track/{report_id}"},
        }
    except Exception as e:
        return {"tool": "track_report", "error": str(e)}


def _encode_geohash(latitude, longitude, precision=7):
    BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    lat_interval, lon_interval = [-90.0, 90.0], [-180.0, 180.0]
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True
    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2
            if longitude > mid:
                ch |= bits[bit]
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if latitude > mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(BASE32[ch])
            bit = 0
            ch = 0
    return "".join(geohash)


async def check_locality(args: dict, user_id: str, token: str) -> dict:
    check_type = args.get("check_type", "")
    if not check_type:
        return {
            "tool": "check_locality",
            "needs_more_info": True,
            "message": "What would you like to check? Options: water supply, waste management, electricity, or infrastructure.",
        }
    try:
        data = await post(f"/api/locality/{check_type}", {}, token)
        return {"tool": "check_locality", "check_type": check_type, "data": data}
    except Exception as e:
        return {"tool": "check_locality", "error": str(e)}


async def get_announcements(args: dict, user_id: str, token: str) -> dict:
    try:
        data = await get("/api/announcements", token)
        announcements = data if isinstance(data, list) else data.get("announcements", [])
        items = [{"title": a.get("title", ""), "body": a.get("body", "")[:100]} for a in announcements[:5]]
        return {"tool": "get_announcements", "announcements": items, "count": len(items)}
    except Exception as e:
        return {"tool": "get_announcements", "error": str(e)}


# ── Registry ─────────────────────────────────────────────────────────

HANDLERS = {
    "list_reports": list_reports,
    "track_report": track_report,
    "check_locality": check_locality,
    "get_announcements": get_announcements,
}
