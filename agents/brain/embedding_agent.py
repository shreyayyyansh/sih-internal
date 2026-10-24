import os
from pydantic import BaseModel
from brain.llm import get_embeddings
from dotenv import load_dotenv

load_dotenv()

# Initialize the embedding model
embeddings_model = get_embeddings(model="gemini-embedding-001", output_dimensionality=768)

async def generate_embedding(text: str) -> list[float]:
    """
    Takes a string and generates a vector array for RAG.
    """
    try:
        print("Generating embedding for text: ", text)
        # aembed_query is the async method for embedding a single string
        vector = await embeddings_model.aembed_query(text)
        return vector
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise e
