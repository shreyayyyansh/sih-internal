import os
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
from tavily import TavilyClient
from brain.urbanconnect.state_civic_analysis import CivicAnalysisState, FactCheckResult

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0, max_retries=2)
factcheck_engine = llm.with_structured_output(FactCheckResult)

async def rag_fact_check(state: CivicAnalysisState):
    """Retrieves official announcements and verifies the user's policy-rumor against them."""
    print(f"--- NODE 3: RAG FACT-CHECK for Post {state.get('post_id')} ---")

    embedding = state.get("embedding", [])
    city = state.get("city", "")
    title = state.get("title", "")
    description = state.get("description", "")
    image_urls = state.get("image_urls", [])
    
    # Grab the dense embedding string for a better web search (fallback to title if missing)
    embedding_string = state.get("embedding_string", title)

    if not embedding:
        print("No embedding available for RAG search, skipping fact-check.")
        return {"is_misinformation": None, "context_note": None}

    # 1. Retrieve relevant official announcements via vector search
    official_context = "No official announcements found for this city."
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/announcements/search",
            # ADD queryText here!
            json={"embedding": embedding, "city": city, "queryText": embedding_string}, 
            timeout=10
        )
        data = response.json()
        announcements = data.get("results", [])

        if announcements:
            context_parts = []
            for i, ann in enumerate(announcements[:5], 1):
                context_parts.append(
                    f"[Official Announcement {i}] "
                    f"By: {ann.get('authorityName', 'Unknown Official')} ({ann.get('department', '')})\n"
                    f"Title: {ann.get('title', '')}\n"
                    f"Content: {ann.get('body', '')}\n"
                    f"Date: {ann.get('createdAt', '')}"
                )
            official_context = "\n\n".join(context_parts)

        # --- STEP 1.5: WEB SEARCH FALLBACK ---
        if len(announcements) < 2:
            print("  ├─> [WEB SEARCH] Local RAG insufficient. Hitting Tavily API...")
            try:
                tavily_api_key = os.getenv("TAVILY_API_KEY")
                if tavily_api_key:
                    tavily_client = TavilyClient(api_key=tavily_api_key)
                    search_city = city.strip() if city and city.strip() else "Prayagraj"
                    
                    # Clean up the query using the first 12 words of the embedding string
                    clean_query_base = embedding_string.split()[:12]
                    clean_query_str = " ".join(clean_query_base)
                    query = f"{search_city} {clean_query_str} official news update"
                    
                    print(f"  ├─> [WEB SEARCH] Query: \"{query}\"")
                    
                    # Search depth changed to advanced for better context scraping
                    search_result = tavily_client.search(query=query, search_depth="advanced", max_results=3)
                    
                    results_count = len(search_result.get("results", []))
                    print(f"  ├─> [WEB SEARCH] Tavily returned {results_count} results.")
                    
                    web_context_parts = []
                    for i, res in enumerate(search_result.get("results", []), 1):
                        web_context_parts.append(
                            f"[Live Web Source {i}] "
                            f"Title: {res.get('title', '')}\n"
                            f"Content Snippet: {res.get('content', '')}\n"
                            f"URL: {res.get('url', '')}"
                        )
                    
                    if web_context_parts:
                        web_context_str = "\n\n".join(web_context_parts)
                        if "No official announcements" in official_context:
                            official_context = web_context_str
                        else:
                            official_context += "\n\n" + web_context_str
                        print("  ├─> [WEB SEARCH] Found live web context.")
                else:
                    print("  ├─> [WEB SEARCH] Skipped. No TAVILY_API_KEY found.")
            except Exception as e:
                print(f"  ├─> [WEB SEARCH] Failed: {e}")

    except Exception as e:
        print(f"Announcement search failed: {e}")

    # 2. Ask LLM to verify claim against official context
    prompt = f"""You are the Lead Fact-Checker for the UrbanConnect civic platform in {city}.

USER'S CLAIM:
Title: {title}
Description: {description}

RETRIEVED CONTEXT (Ground Truth):
{official_context}

EVALUATION RULES:
1. STRICT COMPARISON: Compare the User's Claim strictly against the Retrieved Context. 
2. WHAT IS MISINFORMATION: Flag as 'True' ONLY if the context directly contradicts the user's claim, or if the user is stating a known rumor that the official context has explicitly debunked.
3. INSUFFICIENT DATA: If the retrieved context is completely unrelated to the claim, or if it says "No official announcements found", you MUST set is_misinformation to False. We do not censor citizens without proof.
4. PARTIAL TRUTHS: If the claim exaggerates a real event (e.g., user claims a fine is 5000 Rs, but context says it's 500 Rs), flag as misinformation and correct the number in the context_note.
5. IMAGES: If an image contradicts the official facts, mark it as misinformation.

OUTPUT INSTRUCTIONS:
- reasoning: Briefly explain your logic internally before making the final decision.
- is_misinformation: Boolean True or False based on the rules.
- context_note: Write a polite, neutral, 1-2 sentence correction that we will show to the community. Cite the specific department or source if available.
"""

    # Build multimodality content
    content_parts = [{"type": "text", "text": prompt}]
    for url in image_urls[:3]:
        if url:
            content_parts.append({"type": "image_url", "image_url": url})

    try:
        result = await factcheck_engine.ainvoke([HumanMessage(content=content_parts)])
        
        # Log the AI's internal reasoning so you can debug why it made a choice
        print(f"  ├─> [REASONING]: {result.reasoning}")
        print(f"  ├─> Misinformation Flagged: {result.is_misinformation}")
        print(f"  └─> Context generated: {bool(result.context_note)}")
        
        return {
            "is_misinformation": result.is_misinformation,
            "context_note": result.context_note
        }
    except Exception as e:
        print(f"Fact-check failed: {e}")
        return {"is_misinformation": None, "context_note": None}