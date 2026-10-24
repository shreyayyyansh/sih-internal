from brain.llm import get_genai_client, get_project, get_location

print(f"Vertex AI project={get_project()} location={get_location()}")

client = get_genai_client()

print("\n--- QUERYING VERTEX AI ---")
try:
    response = client.models.generate_content(model="gemini-2.5-flash", contents="Reply with exactly: pong")
    print(f"✅ gemini-2.5-flash replied: {response.text!r}")
except Exception as e:
    print(f"❌ API CONNECTION ERROR: {e}")
