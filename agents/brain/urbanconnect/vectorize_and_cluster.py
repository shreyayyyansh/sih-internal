import os
import requests
from dotenv import load_dotenv
from brain.urbanconnect.state_civic_analysis import CivicAnalysisState

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

async def vectorize_and_cluster(state: CivicAnalysisState):
    """Generates embedding using the multimodal string and checks for emerging issue clusters."""
    print(f"--- NODE 2: VECTORIZE & CLUSTER for Post {state.get('post_id')} ---")

    from brain.embedding_agent import generate_embedding

    fallback_text = f"{state.get('title', '')} {state.get('description', '')}".strip()
    text_to_embed = state.get("embedding_string", fallback_text)
    
    if not text_to_embed:
        text_to_embed = fallback_text

    try:
        embedding = await generate_embedding(text_to_embed)
    except Exception as e:
        print(f"  └─> [ERROR] Embedding generation failed: {e}")
        return {"embedding": [], "cluster_id": None}

    cluster_id = None
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/urbanconnect/cluster-check",
            json={
                "postId": state.get("post_id"),
                "embedding": embedding,
                "city": state.get("city", "")
            },
            timeout=10
        )
        response.raise_for_status() 
        
        data = response.json()
        cluster_id = data.get("clusterId")
        print(f"  ├─> Backend Response: clusterId={cluster_id}, size={data.get('clusterSize')}")
        
        if cluster_id:
            print(f"  └─> [CLUSTER FORMED/JOINED] {cluster_id}")
        else:
            print("  └─> [NO CLUSTER] Not enough similarity")
            
    except Exception as e:
        print(f"  └─> [ERROR] Cluster check failed: {e}")

    return {"embedding": embedding, "cluster_id": cluster_id}