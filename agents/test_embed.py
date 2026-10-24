from langchain_google_genai import GoogleGenerativeAIEmbeddings
import asyncio

async def main():
    e = GoogleGenerativeAIEmbeddings(model='models/embedding-001')
    vector = await e.aembed_query('test')
    print("Success! Vector size:", len(vector))

if __name__ == "__main__":
    asyncio.run(main())
