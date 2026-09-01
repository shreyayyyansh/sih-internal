import os
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
from brain.urbanconnect.state_civic_analysis import TriageResult,CivicAnalysisState
load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0, max_retries=2)
triage_engine = llm.with_structured_output(TriageResult)
async def triage_and_sentiment(state: CivicAnalysisState):
    """Classifies sentiment, urgency, post type, and generates a multimodal embedding string."""
    print(f"--- NODE 1: TRIAGE & SENTIMENT for Post {state.get('post_id')} ---")

    title = state.get("title", "")
    description = state.get("description", "")
    image_urls = state.get("image_urls", [])

    content_parts = [
        {
            "type": "text",
            "text": f"""Analyze this UrbanConnect civic forum post.

POST TITLE: {title}
POST DESCRIPTION: {description}

CLASSIFICATION RULES:
1. SENTIMENT: Rate the emotional tone.
   - POSITIVE: Constructive suggestions, appreciation, community support
   - NEUTRAL: Questions, informational posts, neutral observations
   - NEGATIVE: Complaints, frustration, anger about local issues
   - ALARMING: Panic-inducing, fear-mongering, inflammatory language

2. URGENCY: How time-sensitive is this?
   - LOW: General discussion, suggestions, non-urgent observations
   - MEDIUM: Ongoing local issues needing attention
   - HIGH: Active safety hazards, flooding, outages affecting many people
   - CRITICAL: Immediate life-threatening situations

3. POST TYPE (Critical for routing):
   - CIVIC_REPORT: First-hand accounts of LOCAL, PHYSICAL problems the user is witnessing.
   - POLICY_RUMOR: Wide-scale statements, rumors, or questions about city POLICY, GOVERNMENT RULES, or ANNOUNCEMENTS.
   - GENERAL: Strictly casual/social discussion, opinions, or non-governmental questions.

4. EMBEDDING STRING (Multimodal Summary):
   Generate a dense, factual, and highly descriptive string summarizing the core issue for vector database clustering.
   - COMBINE the user's text with a literal, objective description of what is actually visible in the provided images (if any).
   - If an image is provided, describe the specific objects, scale of damage, colors, or visual context (e.g., "Image shows a 3-foot wide pothole filled with muddy water next to a sidewalk").
   - Strip away filler words, greetings, or emotions. Focus entirely on keywords, locations, physical objects, and the exact nature of the incident.
"""
        }
    ]

    # Add images if available (multimodal capability)
    for url in image_urls[:3]:  # Max 3 images
        if url:
            content_parts.append({"type": "image_url", "image_url": url})

    message = HumanMessage(content=content_parts)
    
    try:
        result = await triage_engine.ainvoke([message])
        print(f"  └─> [SUCCESS] Type: {result.post_type} | Urgency: {result.urgency}")
        print(f"  └─> [EMBEDDING STRING GENERATED]: {result.embedding_string[:50]}...")
        
        return {
            "sentiment": result.sentiment,
            "sentiment_score": result.sentiment_score,
            "urgency": result.urgency,
            "post_type": result.post_type,
            "embedding_string": result.embedding_string # Added to the state update
        }
    except Exception as e:
        print(f"Triage failed: {e}")
        # Fallback state ensuring the pipeline doesn't crash
        return {
            "sentiment": "NEUTRAL",
            "sentiment_score": 0.5,
            "urgency": "LOW",
            "post_type": "GENERAL",
            "embedding_string": f"{title} {description}".strip() 
        }