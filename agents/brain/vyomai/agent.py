"""
vyomai/agent.py — Vyom AI: The UrbanFlow LangGraph Voice Assistant.

4-node graph:
  START → Router → Tool Executor → Context Enricher → Responder → END
                  (skip tools if direct response)
"""

import os
import json
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END, START
from google import genai

from brain.vyomai.state import VyomState
from brain.vyomai.tools import TOOL_SCHEMAS, execute_tool

load_dotenv()

# ─── LLM Setup (google-genai SDK — uses Google Cloud billing) ────────

if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found!")

gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
MODEL_NAME = "gemini-2.0-flash"


# ─── System Prompts ─────────────────────────────────────────────────

ROUTER_PROMPT = """You are Vyom AI, the UrbanFlow smart city voice assistant router.
Your job is to understand the user's message and decide:
  (a) which tool to call, OR
  (b) to respond directly if no tool is needed, OR
  (c) to ask a follow-up question if required information is missing.

AVAILABLE TOOLS:
{tool_descriptions}

═══ CRITICAL RULES ═══

1. **NEVER call a tool if its REQUIRED parameters are missing.**
   - If the user says "close my job" without a job ID or rating, DO NOT call close_and_rate_job. Ask for the missing info.

2. **Multi-turn flows**: Some tools (like post_job) are multi-turn. If a tool previously returned needs_more_info, the user's follow-up is likely answering that question. Pass the collected_data from conversation context.

3. For general chat/greetings, respond with direct_response=true. Be friendly and helpful.

4. If the message is "__session_start__", call "check_updates".

5. For navigation (open StreetGig, go to CivicConnect) → call navigate.

6. Be lenient with language — understand Hindi, Hinglish, and casual phrasing.

7. You can call multiple tools if the user asks for multiple things.

9. When asking for missing info, be specific. Don't say "please provide more details" — say exactly WHAT you need.

═══ RESPONSE FORMAT ═══

ONLY respond with valid JSON (no markdown fences):

For tool calls (when all REQUIRED params are available):
{{
    "direct_response": false,
    "tool_calls": [
        {{"name": "tool_name", "arguments": {{...}}}}
    ]
}}

For direct responses OR follow-up questions:
{{
    "direct_response": true,
    "message": "Your response or follow-up question here",
    "tool_calls": []
}}
"""

RESPONDER_PROMPT = """You are Vyom AI, the UrbanFlow smart city voice assistant.

═══ RESPONSE RULES ═══

1. **If ANY tool result has "needs_more_info": true**, your ENTIRE response must be that tool's follow-up question. Do NOT summarize other results. Just ask the question naturally.

2. **If a tool returned an error**, apologize briefly and suggest what the user can try.

3. **For successful results**, present the information clearly:
   - Use **bold** for important labels
   - Use bullet points for lists
   - Keep it concise — no walls of text
   - Be conversational, not robotic

4. If there are navigation actions, mention them briefly (e.g., "I've opened StreetGig for you").

5. Keep responses short enough to sound natural when read aloud (voice assistant).

═══ CONTEXT ═══

User ID: {user_id}

Conversation so far:
{history}

Tool results:
{tool_results}

{proactive_context}

Generate your response:"""


# ─── Node 1: Router ─────────────────────────────────────────────────

def _format_tool_descriptions() -> str:
    lines = []
    for t in TOOL_SCHEMAS:
        params = t["parameters"]["properties"]
        required = t["parameters"].get("required", [])
        if params:
            parts = []
            for k, v in params.items():
                marker = " [REQUIRED]" if k in required else ""
                parts.append(f'{k}: {v.get("type", "any")}{marker}')
            param_str = ", ".join(parts)
        else:
            param_str = "none"
        lines.append(f'- {t["name"]}({param_str}): {t["description"]}')
    return "\n".join(lines)


async def router_node(state: VyomState):
    """Classifies intent and selects tools to call."""
    history_text = "\n".join(
        f'{m["role"]}: {m["text"]}' for m in (state.get("messages") or [])[-10:]
    )

    prompt = ROUTER_PROMPT.format(tool_descriptions=_format_tool_descriptions())

    # Build context about pending multi-turn flows
    pending = state.get("pending_intent") or ""
    collected = state.get("collected_data") or {}
    pending_context = ""
    if pending:
        pending_context = f"\n\nACTIVE MULTI-TURN FLOW: The tool '{pending}' is waiting for more info. Collected so far: {json.dumps(collected)}. The user's message is likely answering the pending question. Call '{pending}' with the collected_data plus the new info."

    user_msg = f"""Conversation history:
{history_text}
{pending_context}

Current user message: "{state['current_message']}"

Decide: call a tool (only if ALL required params are available), ask a follow-up question (direct_response), or respond directly."""

    try:
        full_prompt = f"{prompt}\n\n{user_msg}"
        response = gemini_client.models.generate_content(
            model=MODEL_NAME,
            contents=full_prompt,
            config={"temperature": 0.1},
        )

        raw = response.text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)

        if parsed.get("direct_response"):
            return {
                "tool_calls": [],
                "tool_results": [],
                "response": parsed.get("message", ""),
            }

        return {
            "tool_calls": parsed.get("tool_calls", []),
            "tool_results": [],
        }
    except Exception as e:
        print(f"[Vyom Router] Error: {e}", flush=True)
        return {
            "tool_calls": [],
            "tool_results": [],
            "response": "Sorry, I had trouble understanding that. Could you try again?",
        }


# ─── Node 2: Tool Executor ──────────────────────────────────────────

async def tool_executor(state: VyomState):
    """Execute all selected tools and collect results."""
    tool_calls = state.get("tool_calls") or []
    if not tool_calls:
        return {"tool_results": []}

    user_id = state.get("user_id", "")
    token = state.get("_token", "")
    results = []
    action = None
    pending_intent = None
    collected_data = None

    for tc in tool_calls:
        name = tc.get("name", "")
        args = tc.get("arguments", {})
        
        # Inject device location implicitly if available
        location = (state.get("collected_data") or {}).get("location")
        if location:
            args["_location"] = location

        print(f"[Vyom] Executing tool: {name}({args})", flush=True)
        result = await execute_tool(name, args, user_id, token)
        print(f"[Vyom] Tool result: {name} → {json.dumps(result, default=str)[:300]}", flush=True)
        results.append(result)

        # Capture navigation action if present
        if result.get("action"):
            action = result["action"]

        # Track multi-turn state
        if result.get("needs_more_info"):
            pending_intent = name
            collected_data = result.get("collected_data", args)

    output = {
        "tool_results": results,
        "action": action,
    }

    # Forward multi-turn state
    if pending_intent:
        output["pending_intent"] = pending_intent
        output["collected_data"] = collected_data
    else:
        # Clear pending intent on successful execution
        output["pending_intent"] = None
        output["collected_data"] = None

    return output


# ─── Node 3: Context Enricher ───────────────────────────────────────

async def context_enricher(state: VyomState):
    """Merge tool results with proactive update context."""
    tool_results = state.get("tool_results") or []
    proactive = ""

    for result in tool_results:
        if result.get("tool") == "check_updates" and result.get("has_updates"):
            updates = result.get("updates", [])
            proactive = "Proactive updates for the user:\n" + "\n".join(updates)

    return {"proactive_updates": proactive}


# ─── Node 4: Responder ──────────────────────────────────────────────

async def responder_node(state: VyomState):
    """Generate a natural language response using tool results and context."""
    # If router already generated a direct response, pass it through
    if state.get("response") and not state.get("tool_results"):
        return {}

    history_text = "\n".join(
        f'{m["role"]}: {m["text"]}' for m in (state.get("messages") or [])[-10:]
    )

    tool_results_text = json.dumps(state.get("tool_results") or [], indent=2, default=str)
    proactive = state.get("proactive_updates") or ""
    proactive_context = f"PROACTIVE UPDATES TO MENTION:\n{proactive}" if proactive else "No proactive updates."

    prompt = RESPONDER_PROMPT.format(
        user_id=state.get("user_id", "unknown"),
        history=history_text or "No prior conversation.",
        tool_results=tool_results_text,
        proactive_context=proactive_context,
    )

    try:
        print(f"[Vyom Responder] Sending prompt ({len(prompt)} chars) ...", flush=True)
        response = gemini_client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={"temperature": 0.3},
        )
        text = response.text.strip()
        print(f"[Vyom Responder] Got response: {text[:200]}", flush=True)
        return {"response": text}
    except Exception as e:
        print(f"[Vyom Responder] Error: {e}", flush=True)
        return {"response": "Sorry, I couldn't process that right now. Please try again."}


# ─── Graph Assembly ──────────────────────────────────────────────────

def should_use_tools(state: VyomState) -> str:
    """Conditional edge: skip tools if router gave a direct response."""
    if state.get("response") and not state.get("tool_calls"):
        return "responder"
    return "tool_executor"


graph = StateGraph(VyomState)

graph.add_node("router", router_node)
graph.add_node("tool_executor", tool_executor)
graph.add_node("context_enricher", context_enricher)
graph.add_node("responder", responder_node)

graph.add_edge(START, "router")
graph.add_conditional_edges("router", should_use_tools, {
    "tool_executor": "tool_executor",
    "responder": "responder",
})
graph.add_edge("tool_executor", "context_enricher")
graph.add_edge("context_enricher", "responder")
graph.add_edge("responder", END)

vyom_agent = graph.compile()
