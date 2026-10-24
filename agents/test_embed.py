from brain.llm import get_embeddings
import asyncio

async def main():
    e = get_embeddings()
    vector = await e.aembed_query('test')
    print("Success! Vector size:", len(vector))

if __name__ == "__main__":
    asyncio.run(main())
