import os
from typing import Optional, List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langchain_core.messages import HumanMessage
from brain.streetgig.skill_graph_agent import extract_skills, SkillExtractionResult

load_dotenv()

if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("Google API Key is not found")

# --- Schemas ---

class JobEnrichmentOutput(BaseModel):
    enriched_description: str = Field(
        description="A comprehensive and professional job description synthesized from the available data. Required even if original was provided."
    )
    # Removed vector_embedding_string: Let the actual embedding model handle this natively.

class FeedbackQuestion(BaseModel):
    question: str = Field(description="The text of the question (e.g., 'How would you rate the plumber's punctuality?')")
    type: str = Field(description="Must be 'rating' for star ratings or 'comment' for text feedback")
    max_score: Optional[int] = Field(default=None, description="For rating type, the maximum score (usually 5). Null for comments.")

class FeedbackFormOutput(BaseModel):
    questions: List[FeedbackQuestion] = Field(
        description="List of exactly 4 questions: 3 'rating' questions specific to the job category, and 1 general 'comment' question for suggestions."
    )

# --- Graph State ---
class JobAgentState(BaseModel):
    # Inputs
    job_id: str = Field(description="The unique identifier of the job")
    description: Optional[str] = Field(default="", description="Original job description provided by user")
    category: str = Field(description="Category of the job (e.g., Plumbing, Electrical)")
    location: str = Field(description="Job location or address summary")
    amount: float = Field(description="Amount offered for the job")
    time: str = Field(description="Time when the job is required")
    
    # Outputs
    enriched_description: Optional[str] = Field(default=None, description="Generated comprehensive description")
    feedback_form: Optional[List[FeedbackQuestion]] = Field(default=None, description="Generated feedback questions")
    extracted_skills: Optional[SkillExtractionResult] = Field(default=None, description="Skills extracted by graph agent")
    job_embedding: Optional[List[float]] = Field(default=None, description="Dense vector array for Vector DB / RAG")


# --- LLM Setup ---
flash_model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.2, 
    max_retries=2,
)

# New: Initialize the embedding model
embeddings_model = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001",
    output_dimensionality=768)

structured_enricher = flash_model.with_structured_output(JobEnrichmentOutput)
structured_feedback_generator = flash_model.with_structured_output(FeedbackFormOutput)

# --- Nodes ---

async def enrich_job_data(state: JobAgentState):
    """
    Analyzes the job inputs and synthesizes a rich, professional description.
    """
    print(f"--- ENRICHING JOB DATA FOR: {state.job_id} ---")
    
    prompt = f"""
    You are an expert platform marketplace AI. Your task is to optimize a job listing for users.
    
    JOB CONTEXT:
    - Category: {state.category}
    - Location: {state.location}
    - Amount: {state.amount}
    - Time: {state.time}
    - Original User Description: {state.description if state.description else "NOT PROVIDED"}
    
    INSTRUCTIONS:
    If the original description is sparse, incomplete, or missing, write a clear, professional, and detailed job description incorporating the provided category, time, and amount. If the original is already excellent, just lightly polish it for clarity.
    """
    
    message = HumanMessage(content=prompt)
    
    try:
        response = await structured_enricher.ainvoke([message])
        return {"enriched_description": response.enriched_description}
    except Exception as e:
        print(f"Error enriching job data: {e}")
        return {"enriched_description": state.description or f"Need a {state.category} at {state.time} for {state.amount}"}

async def extract_job_skills(state: JobAgentState):
    """
    Extracts discrete skills from the enriched description using the skill graph agent.
    Runs after enrich_job_data, before generate_embedding.
    """
    print(f"--- EXTRACTING SKILLS FOR: {state.job_id} ---")
    text = state.enriched_description or state.description or f"{state.category} job"
    try:
        result = await extract_skills(text)
        print(f"Extracted {len(result.skills)} skills: {[s.skill_id for s in result.skills]}")
        return {"extracted_skills": result}
    except Exception as e:
        print(f"Error extracting skills: {e}")
        return {"extracted_skills": SkillExtractionResult(skills=[], experience_level='mid', category_guess=state.category)}

async def generate_embedding(state: JobAgentState):
    """
    Takes the newly enriched description and generates a vector array for RAG.
    """
    print(f"--- GENERATING EMBEDDING FOR: {state.job_id} ---")
    
    # Use the enriched description for the most robust semantic vector
    text_to_embed = state.enriched_description
    
    try:
        # aembed_query is the async method for embedding a single string
        vector = await embeddings_model.aembed_query(text_to_embed)
        return {"job_embedding": vector}
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return {"job_embedding": []}

async def generate_feedback_form(state: JobAgentState):
    """
    Generates a customized feedback form based on the job category and title.
    """
    print(f"--- GENERATING FEEDBACK FORM FOR: {state.job_id} ---")
    # ... (Prompt remains exactly the same as your original code) ...
    prompt = f"""
    You are a customer experience AI. Your task is to generate a custom feedback form for a worker who just completed a job.
    
    JOB CONTEXT:
    - Category: {state.category}
    - Amount: {state.amount}
    - Time: {state.time}
    
    INSTRUCTIONS:
    Generate exactly 4 questions:
    - Questions 1-3 MUST be of type 'rating' (max_score: 5). These should evaluate specific aspects relevant to the job category.
    - Question 4 MUST be of type 'comment' (max_score: null). This should ask for any additional comments or suggestions for the worker.
    """
    
    message = HumanMessage(content=prompt)
    
    try:
        response = await structured_feedback_generator.ainvoke([message])
        return {"feedback_form": response.questions}
    except Exception as e:
        print(f"Error generating feedback form: {e}")
        return {"feedback_form": []}

# --- Graph Assembly ---

graph = StateGraph(JobAgentState)

graph.add_node('enrich_job_data', enrich_job_data)
graph.add_node('extract_job_skills', extract_job_skills)
graph.add_node('generate_embedding', generate_embedding)
graph.add_node('generate_feedback_form', generate_feedback_form)

# Parallel execution: Enrichment and Feedback start immediately
graph.add_edge(START, 'enrich_job_data')
graph.add_edge(START, 'generate_feedback_form')

# Sequencing: enrich -> extract_skills -> embedding
graph.add_edge('enrich_job_data', 'extract_job_skills')
graph.add_edge('extract_job_skills', 'generate_embedding')

# Both parallel tracks lead to the end independently
graph.add_edge('generate_embedding', END)
graph.add_edge('generate_feedback_form', END)

# Compile the agent graph
app = graph.compile()