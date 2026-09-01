from langgraph.graph import StateGraph, END
from brain.urbanconnect.scrapper.state_city_pulse import CityPulseState
from brain.urbanconnect.scrapper.node_analyze_pulse import run_analyze_pulse_node


workflow = StateGraph(CityPulseState)


workflow.add_node("analyze_pulse_node", run_analyze_pulse_node)


workflow.set_entry_point("analyze_pulse_node")
workflow.add_edge("analyze_pulse_node", END)


city_pulse_graph = workflow.compile()

async def fetch_and_analyze_city_pulse_graph(city: str, posts: list, previous_data: dict = None) -> dict:
    """
    Initializes the graph state and runs the compiled LangGraph workflow.
    """
    initial_state = {
        "city": city,
        "posts": posts,
        "previous_data": previous_data,
        "final_analysis": None
    }
    
    final_state = await city_pulse_graph.ainvoke(initial_state)

    return final_state["final_analysis"]