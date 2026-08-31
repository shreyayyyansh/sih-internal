"""
StreetGig tools — job posting, searching, matching, and upskilling.
"""

from brain.vyomai.tools._http import get, post
from brain.vyomai.tools._constants import NAV_PATHS, JOB_CATEGORIES, TIME_SLOTS

# ── Schemas ──────────────────────────────────────────────────────────

SCHEMAS = [
    {
        "name": "post_job",
        "description": "Post a new StreetGig job. This is a MULTI-TURN flow. Pass whatever info you can extract. The tool will ask for missing fields step-by-step. Fields: category, amount, time, description.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Job category e.g. Plumber, Electrician, Carpenter"},
                "amount": {"type": "string", "description": "Budget amount e.g. 500, 1000"},
                "time": {"type": "string", "description": "Duration: Quick (< 1 hr), 1-2 Hours, Half Day, Full Day, Flexible"},
                "description": {"type": "string", "description": "Description of the work needed"},
                "collected_data": {"type": "object", "description": "Previously collected data from earlier turns in the conversation"},
            },
            "required": [],
        },
    },
    {
        "name": "list_my_jobs",
        "description": "List the user's posted StreetGig jobs (employer view). Use when user asks 'my jobs', 'my listings'.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "find_nearby_jobs",
        "description": "Find open jobs near user's location (worker view). Use for 'any jobs nearby?', 'find work'.",
        "parameters": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "User's latitude"},
                "lng": {"type": "number", "description": "User's longitude"},
            },
            "required": [],
        },
    },
    {
        "name": "get_job_recommendations",
        "description": "AI-powered job recommendations based on worker's skills. Use for 'recommend jobs', 'what jobs suit me?'.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "match_workers",
        "description": "Find best workers for a job via Graph RAG. REQUIRES: job_id. Ask the user which job if not provided.",
        "parameters": {
            "type": "object",
            "properties": {"job_id": {"type": "string", "description": "The job ID (REQUIRED)"}},
            "required": ["job_id"],
        },
    },
    {
        "name": "join_job",
        "description": "Worker applies to a job. REQUIRES: job_id. Ask which job if not provided.",
        "parameters": {
            "type": "object",
            "properties": {"job_id": {"type": "string", "description": "The job ID to apply for (REQUIRED)"}},
            "required": ["job_id"],
        },
    },
    {
        "name": "close_and_rate_job",
        "description": "Close a completed job and rate the worker. REQUIRES: job_id, rating, AND worker_id. Ask for missing info.",
        "parameters": {
            "type": "object",
            "properties": {
                "job_id": {"type": "string", "description": "The job ID to close (REQUIRED)"},
                "rating": {"type": "number", "description": "Rating 1-5 (REQUIRED)"},
                "worker_id": {"type": "string", "description": "The worker's user ID (REQUIRED)"},
                "feedback": {"type": "string", "description": "Optional feedback text"},
            },
            "required": ["job_id", "rating", "worker_id"],
        },
    },
    {
        "name": "get_learning_schemes",
        "description": "Personalized upskilling/learning courses for workers. Use for 'courses for me', 'learning schemes'.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
]


# ── Handlers ─────────────────────────────────────────────────────────

async def post_job(args: dict, user_id: str, token: str) -> dict:
    collected = args.get("collected_data") or {}
    for field in ["category", "amount", "time", "description"]:
        val = args.get(field)
        if val:
            collected[field] = val

    # Carry forward device location if injected by tool executor
    if args.get("_location") and not collected.get("_location"):
        collected["_location"] = args["_location"]

    # Step-by-step multi-turn collection
    if not collected.get("category"):
        return {
            "tool": "post_job", "needs_more_info": True,
            "message": "What type of work do you need? For example: Plumber, Electrician, Carpenter, Cleaners, Painters...",
            "options": JOB_CATEGORIES[:15], "collected_data": collected,
        }
    if not collected.get("amount"):
        return {
            "tool": "post_job", "needs_more_info": True,
            "message": f"Got it — **{collected['category']}**. What's your budget?",
            "options": ["₹200", "₹500", "₹1000", "₹2000"], "collected_data": collected,
        }
    if not collected.get("time"):
        return {
            "tool": "post_job", "needs_more_info": True,
            "message": f"Budget: ₹{collected['amount']}. How long do you need the worker?",
            "options": TIME_SLOTS, "collected_data": collected,
        }
    if not collected.get("description"):
        return {
            "tool": "post_job", "needs_more_info": True,
            "message": "Almost done! Briefly describe what needs to be done:",
            "collected_data": collected,
        }

    # All fields collected — create the job
    try:
        amount = int(str(collected["amount"]).replace("₹", "").replace(",", "").strip())

        # Location is REQUIRED by the server — use device location or default
        location = collected.get("_location", args.get("_location"))
        if not location or not isinstance(location, dict):
            # Fallback: use a Delhi default so job post doesn't fail silently
            location = {"lat": 28.6139, "lng": 77.2090}

        data = await post("/api/jobs", {
            "description": collected["description"],
            "amount": amount,
            "time": collected["time"],
            "category": collected["category"],
            "location": location,
        }, token)
        return {
            "tool": "post_job", "data": data,
            "message": "Job posted successfully! Workers nearby will be notified.",
            "action": {"type": "navigate", "path": NAV_PATHS["StreetGig"]},
        }
    except Exception as e:
        return {"tool": "post_job", "error": str(e)}


async def list_my_jobs(args: dict, user_id: str, token: str) -> dict:
    try:
        data = await get("/api/jobs/my", token)
        jobs = data if isinstance(data, list) else data.get("jobs", [])
        if not jobs:
            return {"tool": "list_my_jobs", "message": "You haven't posted any jobs yet. Say 'post a job' to create one!"}
        items = [
            {"id": j.get("id", ""), "category": j.get("category", ""), "amount": j.get("amount", 0), "status": j.get("status", "OPEN")}
            for j in jobs[:5]
        ]
        return {"tool": "list_my_jobs", "jobs": items, "count": len(items), "action": {"type": "navigate", "path": NAV_PATHS["StreetGig"]}}
    except Exception as e:
        return {"tool": "list_my_jobs", "error": str(e)}


async def find_nearby_jobs(args: dict, user_id: str, token: str) -> dict:
    try:
        params = {}
        if args.get("lat"): params["lat"] = args["lat"]
        if args.get("lng"): params["lng"] = args["lng"]
        data = await get("/api/jobs/nearby", token, params)
        jobs = data if isinstance(data, list) else data.get("jobs", [])
        if not jobs:
            return {"tool": "find_nearby_jobs", "message": "No open jobs found nearby right now. Check back later!"}
        items = [
            {"id": j.get("id", ""), "category": j.get("category", ""), "amount": j.get("amount", 0), "distance": j.get("distance", "")}
            for j in jobs[:5]
        ]
        return {"tool": "find_nearby_jobs", "jobs": items, "count": len(items), "action": {"type": "navigate", "path": NAV_PATHS["StreetGig"]}}
    except Exception as e:
        return {"tool": "find_nearby_jobs", "error": str(e)}


async def get_job_recommendations(args: dict, user_id: str, token: str) -> dict:
    try:
        # Server REQUIRES lat, lng query params for geohash-based search
        location = args.get("_location", {})
        params = {}
        if isinstance(location, dict) and location.get("lat"):
            params["lat"] = location["lat"]
            params["lng"] = location["lng"]
        else:
            # Fallback to Delhi defaults so endpoint doesn't 400
            params["lat"] = 28.6139
            params["lng"] = 77.2090

        data = await get("/api/jobs/recommendations", token, params)
        jobs = data if isinstance(data, list) else data.get("jobs", data.get("recommendations", []))
        if not jobs:
            return {"tool": "get_job_recommendations", "message": "No recommendations right now. Make sure you've set your skills in your profile!"}
        items = [
            {"id": j.get("id", ""), "category": j.get("category", ""), "amount": j.get("amount", 0), "match_reason": j.get("match_reason", "")}
            for j in jobs[:5]
        ]
        return {"tool": "get_job_recommendations", "recommendations": items, "count": len(items), "action": {"type": "navigate", "path": NAV_PATHS["StreetGig"]}}
    except Exception as e:
        return {"tool": "get_job_recommendations", "error": str(e)}


async def match_workers(args: dict, user_id: str, token: str) -> dict:
    job_id = args.get("job_id", "")
    if not job_id:
        return {"tool": "match_workers", "needs_more_info": True, "message": "Which job would you like to find workers for? Please provide the job ID."}
    try:
        data = await get(f"/api/jobs/{job_id}/match-workers", token)
        return {"tool": "match_workers", "data": data}
    except Exception as e:
        return {"tool": "match_workers", "error": str(e)}


async def join_job(args: dict, user_id: str, token: str) -> dict:
    job_id = args.get("job_id", "")
    if not job_id:
        return {"tool": "join_job", "needs_more_info": True, "message": "Which job would you like to apply for? Please provide the job ID."}
    try:
        data = await post(f"/api/jobs/{job_id}/join", {}, token)
        return {"tool": "join_job", "data": data, "message": "You've expressed interest! The employer will be notified."}
    except Exception as e:
        return {"tool": "join_job", "error": str(e)}


async def close_and_rate_job(args: dict, user_id: str, token: str) -> dict:
    job_id = args.get("job_id", "")
    rating = args.get("rating", 0)
    worker_id = args.get("worker_id", "")
    if not job_id:
        return {"tool": "close_and_rate_job", "needs_more_info": True, "message": "Which job would you like to close? Please provide the job ID."}
    if not rating:
        return {"tool": "close_and_rate_job", "needs_more_info": True, "message": "How would you rate the worker? Give a rating from 1 to 5."}
    if not worker_id:
        return {"tool": "close_and_rate_job", "needs_more_info": True, "message": "Which worker completed the job? I need the worker's ID."}
    try:
        # Server expects ratings as a 3-element array and workerId.
        # When user gives a single rating via voice, replicate across all 3 dimensions.
        r = int(rating) if isinstance(rating, (int, float)) else 3
        r = max(1, min(5, r))
        data = await post(f"/api/jobs/{job_id}/close-and-rate", {
            "ratings": [r, r, r],
            "workerId": worker_id,
        }, token)
        return {"tool": "close_and_rate_job", "data": data, "message": f"Job closed with a {r}-star rating. Thank you!"}
    except Exception as e:
        return {"tool": "close_and_rate_job", "error": str(e)}


async def get_learning_schemes(args: dict, user_id: str, token: str) -> dict:
    try:
        data = await get("/api/user/learning-schemes-graph", token)
        schemes = data if isinstance(data, list) else data.get("schemes", data.get("upgradation", []))
        if not schemes:
            return {"tool": "get_learning_schemes", "message": "No learning schemes found. Update your worker profile for personalized recommendations!"}
        items = [{"name": s.get("name", s.get("schemeName", "")), "category": s.get("category", "")} for s in schemes[:5]]
        return {"tool": "get_learning_schemes", "schemes": items, "count": len(items), "action": {"type": "navigate", "path": NAV_PATHS["LearningSchemes"]}}
    except Exception as e:
        return {"tool": "get_learning_schemes", "error": str(e)}


# ── Registry ─────────────────────────────────────────────────────────

HANDLERS = {
    "post_job": post_job,
    "list_my_jobs": list_my_jobs,
    "find_nearby_jobs": find_nearby_jobs,
    "get_job_recommendations": get_job_recommendations,
    "match_workers": match_workers,
    "join_job": join_job,
    "close_and_rate_job": close_and_rate_job,
    "get_learning_schemes": get_learning_schemes,
}
