"""
Shared HTTP helpers for all Vyom AI tool modules.
Provides authenticated GET/POST to the Node.js backend and Python sibling server.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
PYTHON_SERVER = f"http://localhost:{os.getenv('PORT', '10000')}"


async def get(path: str, token: str = "", params: dict = None) -> dict:
    """Authenticated GET to the Node.js backend."""
    headers = {"Authorization": token} if token else {}
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            f"{BACKEND_URL}{path}", headers=headers, params=params or {}
        )
        res.raise_for_status()
        return res.json()


async def post(path: str, body: dict, token: str = "") -> dict:
    """Authenticated POST to the Node.js backend."""
    headers = (
        {"Authorization": token, "Content-Type": "application/json"}
        if token
        else {"Content-Type": "application/json"}
    )
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            f"{BACKEND_URL}{path}", json=body, headers=headers
        )
        res.raise_for_status()
        return res.json()


async def post_python(path: str, body: dict) -> dict:
    """POST to a sibling endpoint on the same Python server."""
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(f"{PYTHON_SERVER}{path}", json=body)
        res.raise_for_status()
        return res.json()
