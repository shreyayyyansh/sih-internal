"""
KindShare tools — donations and requests.
"""

from brain.vyomai.tools._http import get, post
from brain.vyomai.tools._constants import NAV_PATHS

# ── Schemas ──────────────────────────────────────────────────────────

SCHEMAS = [
    {
        "name": "search_kindshare",
        "description": "Search active donation requests on KindShare. Use for 'donate', 'who needs help?', 'any donation requests?'.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Optional filter: food, clothes, medicine, books, etc."},
            },
            "required": [],
        },
    },
    {
        "name": "create_donation_request",
        "description": "Create a new donation request. REQUIRES: category. Ask what they need if not provided.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Category: food, clothes, medicine, books, etc. (REQUIRED)"},
                "description": {"type": "string", "description": "What is needed"},
                "item_name": {"type": "string", "description": "Specific item name if mentioned"},
            },
            "required": ["category"],
        },
    },
    {
        "name": "list_my_donations",
        "description": "List donations the user has made or expressed interest in. Use for 'my donations', 'what have I donated?'.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
]


# ── Handlers ─────────────────────────────────────────────────────────

async def search_kindshare(args: dict, user_id: str, token: str) -> dict:
    try:
        category = args.get("category", "")
        msg = f"Opening KindShare for you to search for {category} donations!" if category else "Opening KindShare for you to browse donations!"
        return {
            "tool": "search_kindshare",
            "message": msg,
            "action": {"type": "navigate", "path": NAV_PATHS["KindShare"]},
        }
    except Exception as e:
        return {"tool": "search_kindshare", "error": str(e)}


async def create_donation_request(args: dict, user_id: str, token: str) -> dict:
    category = args.get("category", "")
    if not category:
        return {
            "tool": "create_donation_request",
            "needs_more_info": True,
            "message": "What type of help do you need? For example: food, clothes, medicine, books...",
        }
    try:
        return {
            "tool": "create_donation_request", 
            "message": f"To request **{category}**, please select an NGO in the KindShare section.",
            "action": {"type": "navigate", "path": NAV_PATHS["KindShare"]},
        }
    except Exception as e:
        return {"tool": "create_donation_request", "error": str(e)}


async def list_my_donations(args: dict, user_id: str, token: str) -> dict:
    try:
        data = await get("/api/interests/donor", token)
        
        # The backend endpoint /api/interests/donor returns { data: [...] }
        interests = []
        if isinstance(data, dict):
            interests = data.get("data", [])
        elif isinstance(data, list):
            interests = data
            
        if not interests:
            return {"tool": "list_my_donations", "message": "You haven't made any donations yet. Say 'I want to donate' to browse requests!"}
            
        items = [{"category": i.get("donationCategory", "Unknown"), "status": i.get("status", "pending"), "recipient": i.get("recipientName", "")} for i in interests[:5]]
        
        return {
            "tool": "list_my_donations", "donations": items, "count": len(items),
            "message": f"You have {len(items)} interests on your donations.",
            "action": {"type": "navigate", "path": NAV_PATHS["KindShare"]},
        }
    except Exception as e:
        return {"tool": "list_my_donations", "error": str(e)}


# ── Registry ─────────────────────────────────────────────────────────

HANDLERS = {
    "search_kindshare": search_kindshare,
    "create_donation_request": create_donation_request,
    "list_my_donations": list_my_donations,
}
