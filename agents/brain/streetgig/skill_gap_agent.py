import os
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

# --- STATE DEFINITION ---
class SkillGapState(TypedDict, total=False):
    questions: List[str]
    ratings: List[int]
    pairedQuestions: List[dict]  # Full question-answer pairs from frontend
    
    # Outputs
    skill_gap_string: str
    skill_gap_embeddings: List[float]

# --- LLM SETUP ---
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.7,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

# --- NODES ---
async def generate_skill_gap_string(state: SkillGapState) -> SkillGapState:
    """Uses LLM to evaluate the star ratings and text feedback to synthesize a holistic skill string."""
    prompt = ChatPromptTemplate.from_template(
        "You are an AI career and skills analyst. Analyze the following feedback an employer gave to a worker after a completed gig.\n"
        "Questions Asked and Ratings Given (1-5 Stars):\n"
        "1. {q1} - {r1} Stars\n"
        "2. {q2} - {r2} Stars\n"
        "3. {q3} - {r3} Stars\n"
        "Employer's Additional Comment (in response to: '{q4}'): {comment}\n\n"
        "Synthesize this into a cohesive 'skill_gap_string' that represents the worker's current verified strengths, highlighted areas for improvement (skill gaps), and any newly acquired skills. "
        "This string should be highly descriptive as it will be embedded into a vector database to match them with future upskilling opportunities or better-suited jobs.\n"
        "Return strictly ONLY the raw string paragraph, no markdown, no prefixes like 'Skill Gap String:'"
    )
    
    chain = prompt | llm
    
    # Extract data from pairedQuestions (contains both questions and answers)
    paired = state.get("pairedQuestions") or []
    q = state.get("questions") or ["", "", "", ""]
    r = state.get("ratings") or [3, 3, 3]
    
    q = q + [""] * (4 - len(q))
    r = r + [3] * (3 - len(r))
    
    # The 4th paired question's answer is the employer's comment (replaces description)
    comment = "No comment provided."
    if len(paired) > 3 and paired[3].get("answer"):
        comment = paired[3]["answer"]
    
    response = await chain.ainvoke({
        "q1": q[0], "r1": r[0],
        "q2": q[1], "r2": r[1],
        "q3": q[2], "r3": r[2],
        "q4": q[3] if len(q) > 3 else "Additional comments",
        "comment": comment
    })
    
    return {"skill_gap_string": response.content.strip()}

async def generate_vector_embeddings(state: SkillGapState) -> SkillGapState:
    """Embeds the generated synthesized skill gap string into a vector."""
    from brain.embedding_agent import generate_embedding
    
    text_to_embed = state.get("skill_gap_string", "")
    
    # If LLM failed, fallback to empty vector so we don't crash
    if not text_to_embed:
        print("Warning: No skill gap string to embed.")
        return {"skill_gap_embeddings": []}
        
    try:
        vector = await generate_embedding(text_to_embed)
        return {"skill_gap_embeddings": vector}
    except Exception as e:
        print(f"Error generating embedding for skill gap: {e}")
        return {"skill_gap_embeddings": []}

# --- GRAPH DEFINITION ---
graph_builder = StateGraph(SkillGapState)

graph_builder.add_node("analyze_feedback", generate_skill_gap_string)
graph_builder.add_node("embed_skill_gap", generate_vector_embeddings)

graph_builder.set_entry_point("analyze_feedback")
graph_builder.add_edge("analyze_feedback", "embed_skill_gap")
graph_builder.add_edge("embed_skill_gap", END)

workflow = graph_builder.compile() 
