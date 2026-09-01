import json
from langchain_google_genai import ChatGoogleGenerativeAI
from brain.urbanconnect.scrapper.state_city_pulse import CityPulseState, CityPulseAnalysis

# Initialize the LLM with the strict output schema
pulse_llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", 
    temperature=0.1
).with_structured_output(CityPulseAnalysis)

async def run_analyze_pulse_node(state: CityPulseState) -> dict:
    """LangGraph Node: Analyzes raw social media data and extracts insights."""
    
    city = state["city"]
    posts = state["posts"]
    previous_data = state["previous_data"]
    
    print(f"\n--- 🌐 [NODE: CITY PULSE] Analyzing {len(posts)} posts for {city} ---")

    # 1. Handle Empty Scrapes immediately
    if not posts:
        print("--- [NODE] No posts provided. Returning empty state. ---")
        empty_result = {
            "executive_summary": "No social media data was scraped for today.",
            "sentiment_metrics": {"public_trust_score": 0.0, "primary_emotion": "Neutral", "top_target_authority": None},
            "trend_analysis": {"direction": "INSUFFICIENT_DATA", "trust_score_delta": 0.0, "insight": "No data today."},
            "extracted_issues": [],
            "recommended_actions": []
        }
        return {"final_analysis": empty_result}

    # 2. Build Historical Context
    history_text = "NO PREVIOUS DATA AVAILABLE (This is the first day of tracking)."
    if previous_data:
        history_text = f"""
        Yesterday's Trust Score: {previous_data.get('previous_trust_score')}
        Yesterday's Summary: {previous_data.get('previous_summary')}
        """

    # 3. Stringify data
    raw_data_string = json.dumps(posts, ensure_ascii=False, indent=2)

    # 4. Master Prompt
    prompt = f"""You are the Lead Data Analyst for the municipal administration of {city}.
    Your job is to read today's raw, noisy social media posts from citizens, filter out the garbage, and create a highly actionable "City Pulse" report for the Mayor.

    RULES:
    1. EXTRACT REAL ISSUES: Find complaints about physical infrastructure or direct municipal corruption. Group similar posts together.
    2. IGNORE SPAM: Disregard national politics, religion, sports, memes, and random chatter.
    3. ANALYZE SENTIMENT: Based ONLY on how citizens talk about the local administration, determine overall sentiment.
    4. TREND ANALYSIS: Compare today's sentiment against yesterday's data. If no history, use INSUFFICIENT_DATA and 0.0.
    5. CITE SOURCES: Attach URLs from the raw posts to the issues they represent.
    6. COMPLETE SCHEMA: Provide specific 'recommended_actions' and extract specific 'locations_mentioned'.

    YESTERDAY'S CONTEXT:
    {history_text}

    TODAY'S RAW SOCIAL MEDIA DATA:
    {raw_data_string}
    """

    try:
        # Call Gemini
        result = await pulse_llm.ainvoke(prompt)
        print(f"  ├─> Evaluated Trust Score: {result.sentiment_metrics.public_trust_score}")
        print(f"  └─> Found {len(result.extracted_issues)} legitimate issues.")
        
        # Return the dictionary to update the graph state's 'final_analysis' key
        return {"final_analysis": result.dict()}
        
    except Exception as e:
        print(f"--- [NODE ERROR] AI Analysis Failed: {e} ---")
        raise e