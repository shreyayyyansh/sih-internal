import asyncio
import os
import json
from dotenv import load_dotenv

# Ensure we can import from the agents directory
import sys
sys.path.append(os.getcwd())

from brain.vyomai.tools.kindshare import search_kindshare, create_donation_request, list_my_donations

load_dotenv()

# --- Configurations for Testing ---
MOCK_USER_ID = os.getenv("TEST_USER_ID", "sample_user_id") 
MOCK_TOKEN = os.getenv("TEST_TOKEN", "sample_token")

async def run_tests():
    print("🚀 Starting Vyom AI KindShare Tools Test...\n")
    
    # 1. Test Search KindShare
    print("--- 1. Testing 'search_kindshare' ---")
    try:
        search_res = await search_kindshare({"category": "food"}, MOCK_USER_ID, MOCK_TOKEN)
        print(f"Result: {json.dumps(search_res, indent=2)}\n")
    except Exception as e:
        print(f"Error: {e}\n")

    # 2. Test Create Donation Request
    print("--- 2. Testing 'create_donation_request' ---")
    try:
        create_res = await create_donation_request({
            "category": "clothes",
            "description": "Need warm clothes for winter",
            "item_name": "Sweaters"
        }, MOCK_USER_ID, MOCK_TOKEN)
        print(f"Result: {json.dumps(create_res, indent=2)}\n")
    except Exception as e:
        print(f"Error: {e}\n")

    # 3. Test List My Donations
    print("--- 3. Testing 'list_my_donations' ---")
    try:
        list_res = await list_my_donations({}, MOCK_USER_ID, MOCK_TOKEN)
        print(f"Result: {json.dumps(list_res, indent=2)}\n")
    except Exception as e:
        print(f"Error: {e}\n")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_tests())
