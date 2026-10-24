from typing import TypedDict, Optional, List


class Message(TypedDict):
    role: str       # "user" | "assistant"
    text: str


class Action(TypedDict, total=False):
    type: str       # "navigate" | "open_notifications" | "highlight_sos"
    path: str


class VyomState(TypedDict):
    # ── Input ──
    user_id: str
    session_id: str
    current_message: str
    messages: List[Message]             # conversation history (last 20)
    _token: Optional[str]               # auth token forwarded from Node proxy

    # ── Multi-turn support ──
    pending_intent: Optional[str]       # active multi-turn tool (e.g. "post_job")
    collected_data: Optional[dict]      # accumulated data across turns

    # ── Internal ──
    tool_calls: Optional[List[dict]]    # tools selected by the router
    tool_results: Optional[List[dict]]  # data returned by tools
    proactive_updates: Optional[str]    # auto-detected changes since last session

    # ── Output ──
    response: str
    action: Optional[Action]
