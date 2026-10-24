"""
General / System tools — navigation, notifications, profile, updates, weather.
"""

import httpx
from brain.vyomai.tools._http import get, post
from brain.vyomai.tools._constants import NAV_PATHS

# ── Schemas ──────────────────────────────────────────────────────────

SCHEMAS = [
    {
        "name": "navigate",
        "description": "Navigate user to an app section. REQUIRES: destination. Available: CivicConnect, StreetGig, SisterHood, UrbanConnect, KindShare, Profile, Notifications, MyJobs, LearningSchemes.",
        "parameters": {
            "type": "object",
            "properties": {
                "destination": {
                    "type": "string",
                    "enum": list(NAV_PATHS.keys()),
                    "description": "App section to navigate to (REQUIRED)",
                },
            },
            "required": ["destination"],
        },
    },
    {
        "name": "check_notifications",
        "description": "Check unread notifications (up to 5). Use for 'any notifications?', 'unread messages'.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_profile",
        "description": "Get user's profile info — name, email, worker status, skills, rating.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "check_updates",
        "description": "Proactive session-start check. Aggregates notifications, report changes, and job updates. Use on first open or 'what's new?'.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "show_weather",
        "description": "Fetch and show live weather info. Use for 'what's the weather?', 'is it going to rain?', 'temperature in Mumbai'. Defaults to user's city.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name to get weather for (optional, defaults to Delhi)"},
            },
            "required": [],
        },
    },
]


# ── Handlers ─────────────────────────────────────────────────────────

async def navigate(args: dict, user_id: str, token: str) -> dict:
    destination = args.get("destination", "")
    path = NAV_PATHS.get(destination)
    if path:
        return {
            "tool": "navigate",
            "message": f"Opening **{destination}** for you.",
            "action": {"type": "navigate", "path": path},
        }
    return {"tool": "navigate", "needs_more_info": True, "message": f"Where would you like to go? Available sections: {', '.join(NAV_PATHS.keys())}"}


async def check_notifications(args: dict, user_id: str, token: str) -> dict:
    try:
        data = await get(f"/api/notifications/{user_id}", token)
        notifications = data if isinstance(data, list) else data.get("notifications", [])
        unread = [n for n in notifications if not n.get("isRead")]

        if not unread:
            return {"tool": "check_notifications", "message": "You're all clear — no unread notifications right now. 🎉"}

        items = []
        for n in unread[:5]:
            msg = n.get("message", n.get("body", n.get("title", "Notification")))
            items.append(f"• {msg}")

        summary = f"You have **{len(unread)} unread notification{'s' if len(unread) != 1 else ''}**:\n" + "\n".join(items)
        if len(unread) > 5:
            summary += f"\n\n...and {len(unread) - 5} more. Opening your notifications."

        return {
            "tool": "check_notifications",
            "message": summary,
            "action": {"type": "navigate", "path": NAV_PATHS["Notifications"]},
        }
    except Exception as e:
        return {"tool": "check_notifications", "error": str(e)}


async def get_profile(args: dict, user_id: str, token: str) -> dict:
    try:
        data = await get("/api/user/profile", token)
        profile = data.get("profile", data)

        # Build a conversational summary
        name = profile.get("name", "there")
        email = profile.get("email", "")
        trust = profile.get("trustScore", profile.get("trust_score"))
        is_worker = profile.get("interestedToWork", False)
        categories = profile.get("workerCategories", [])
        rating = profile.get("rating")
        completed = profile.get("completedJobs", 0)

        parts = [f"**Name:** {name}"]
        if email:
            parts.append(f"**Email:** {email}")
        if trust is not None:
            parts.append(f"**Trust Score:** {trust}")
        if is_worker:
            skills = ", ".join(categories) if categories else "Not set"
            parts.append(f"**Worker Status:** Active")
            parts.append(f"**Skills:** {skills}")
            if rating:
                parts.append(f"**Rating:** {rating} ⭐")
            parts.append(f"**Completed Jobs:** {completed}")
        else:
            parts.append("**Worker Status:** Not registered")

        return {
            "tool": "get_profile",
            "message": "Here's your profile:\n\n" + "\n".join(parts),
            "data": profile,
        }
    except Exception as e:
        return {"tool": "get_profile", "error": str(e)}


async def check_updates(args: dict, user_id: str, token: str) -> dict:
    """Aggregate a daily update from notifications, reports, and profile."""
    updates = []

    # 1. Notifications
    try:
        notifs = await get(f"/api/notifications/{user_id}", token)
        notif_list = notifs if isinstance(notifs, list) else []
        unread = [n for n in notif_list if not n.get("isRead")]
        if unread:
            updates.append(f"You have **{len(unread)} unread notification{'s' if len(unread) != 1 else ''}** pending your review.")
    except Exception:
        pass

    # 2. Civic Reports
    try:
        data = await post("/api/reports/fetch3Reports", {}, token)
        report_data = data.get("data", data) if isinstance(data, dict) else data

        reports = []
        if isinstance(report_data, dict):
            for cat, arr in report_data.items():
                if isinstance(arr, list):
                    reports.extend(arr)
        elif isinstance(report_data, list):
            reports = report_data

        recent_open = [r for r in reports if r.get("status") in ["OPEN", "IN_PROGRESS", "PENDING", "INVESTIGATING", "IN PROGRESS"]]
        if recent_open:
            updates.append(f"You have **{len(recent_open)} active civic report{'s' if len(recent_open) != 1 else ''}** being processed.")
    except Exception:
        pass

    # 3. Profile Stats
    try:
        prof_data = await get("/api/user/profile", token)
        profile = prof_data.get("profile", {})

        trust_score = profile.get("trustScore", profile.get("trust_score"))
        if trust_score is not None:
            updates.append(f"Your community trust score is **{trust_score}**.")

        streak = profile.get("safeWalkStreak", profile.get("safe_walk_streak"))
        if streak:
            updates.append(f"You have an active SisterHood safe walk streak of **{streak} days**.")

        jobs_done = profile.get("completedJobs", 0)
        is_worker = profile.get("interestedToWork")
        if is_worker and jobs_done > 0:
            updates.append(f"You've completed **{jobs_done} StreetGig job{'s' if jobs_done != 1 else ''}**!")
        elif is_worker:
            updates.append("Your StreetGig worker profile is active — scanning for nearby gigs.")
    except Exception:
        pass

    if not updates:
        return {"tool": "check_updates", "message": "You're all caught up! No new updates right now. 🎉"}

    return {
        "tool": "check_updates",
        "updates": updates,
        "action": {"type": "highlight_updates", "payload": updates},
        "message": "Here's your UrbanFlow update:\n\n" + "\n".join(f"• {u}" for u in updates),
    }


# ── Weather code → description mapping ────────────────────────────────
_WEATHER_DESCRIPTIONS = {
    0: "Clear sky ☀️", 1: "Mainly clear 🌤️", 2: "Partly cloudy ⛅", 3: "Overcast ☁️",
    45: "Foggy 🌫️", 48: "Freezing fog 🌫️",
    51: "Light drizzle 🌦️", 53: "Moderate drizzle 🌦️", 55: "Dense drizzle 🌧️",
    61: "Slight rain 🌧️", 63: "Moderate rain 🌧️", 65: "Heavy rain 🌧️",
    71: "Slight snow ❄️", 73: "Moderate snow ❄️", 75: "Heavy snow ❄️",
    80: "Light showers 🌦️", 81: "Moderate showers 🌧️", 82: "Violent showers ⛈️",
    95: "Thunderstorm ⛈️", 96: "Thunderstorm with hail ⛈️", 99: "Severe thunderstorm ⛈️",
}

async def show_weather(args: dict, user_id: str, token: str) -> dict:
    city = args.get("city", "Prayagraj")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # 1. Geocode city name to lat/lng using Open-Meteo Geocoding API (free)
            geo_res = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": city, "count": 1, "language": "en"},
            )
            geo_data = geo_res.json()
            results = geo_data.get("results", [])
            if not results:
                return {"tool": "show_weather", "message": f"Couldn't find weather for '{city}'. Try a different city name."}

            place = results[0]
            lat, lng = place["latitude"], place["longitude"]
            resolved_name = place.get("name", city)

            # 2. Fetch current weather from Open-Meteo (free, no API key)
            weather_res = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
                    "timezone": "auto",
                },
            )
            w = weather_res.json().get("current", {})

            temp = w.get("temperature_2m", "--")
            feels_like = w.get("apparent_temperature", "--")
            humidity = w.get("relative_humidity_2m", "--")
            wind = w.get("wind_speed_10m", "--")
            code = w.get("weather_code", 0)
            condition = _WEATHER_DESCRIPTIONS.get(code, "Unknown")

            msg = (
                f"**Weather in {resolved_name}** — {condition}\n\n"
                f"🌡️ **Temperature:** {temp}°C (feels like {feels_like}°C)\n"
                f"💧 **Humidity:** {humidity}%\n"
                f"💨 **Wind:** {wind} km/h"
            )

            return {"tool": "show_weather", "message": msg}
    except Exception as e:
        return {"tool": "show_weather", "error": str(e)}


# ── Registry ─────────────────────────────────────────────────────────

HANDLERS = {
    "navigate": navigate,
    "check_notifications": check_notifications,
    "get_profile": get_profile,
    "check_updates": check_updates,
    "show_weather": show_weather,
}
