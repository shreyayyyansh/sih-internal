import os
from pydantic import BaseModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("Google API Key is not found")

# Initialize the embedding model
embeddings_model = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001",
    output_dimensionality=768
)

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
