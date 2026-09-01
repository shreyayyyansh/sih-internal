"""
Vyom AI Tools Package — aggregates all feature-specific tool modules.

Exports:
  TOOL_SCHEMAS  — list of all tool schema dicts (fed to the LLM Router)
  TOOL_MAP      — dict mapping tool_name → async handler function
  execute_tool  — dispatcher that calls the right handler
"""

from brain.vyomai.tools import civic, streetgig, kindshare, general

# ── Aggregate schemas from all modules ────────────────────────────────

TOOL_SCHEMAS = (
    civic.SCHEMAS
    + streetgig.SCHEMAS
    + kindshare.SCHEMAS
    + general.SCHEMAS
)

# ── Aggregate handler maps ────────────────────────────────────────────

TOOL_MAP = {
    **civic.HANDLERS,
    **streetgig.HANDLERS,
    **kindshare.HANDLERS,
    **general.HANDLERS,
}


# ── Dispatcher ────────────────────────────────────────────────────────

async def execute_tool(tool_name: str, args: dict, user_id: str, token: str = "") -> dict:
    """Dispatch a tool call and return structured result."""
    try:
        handler = TOOL_MAP.get(tool_name)
        if not handler:
            return {"tool": tool_name, "error": f"Unknown tool: {tool_name}"}
        return await handler(args, user_id, token)
    except Exception as e:
        print(f"[VyomTool] {tool_name} failed: {e}", flush=True)
        return {"tool": tool_name, "error": str(e)}
