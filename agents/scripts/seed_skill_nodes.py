# Run once: python scripts/seed_skill_nodes.py
# Seeds the skill_nodes MongoDB collection with starter ontology

import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

SKILL_SEED = [
    {'skill_id': 'plumbing', 'display_name': 'Plumbing',
     'parent_skill': 'trade_work',
     'adjacent_skills': ['pipe_fitting', 'drainage', 'waterproofing', 'soldering'],
     'category_tags': ['Plumber']},

    {'skill_id': 'pipe_fitting', 'display_name': 'Pipe Fitting',
     'parent_skill': 'plumbing',
     'adjacent_skills': ['plumbing', 'soldering', 'pressure_testing'],
     'category_tags': ['Plumber']},

    {'skill_id': 'electrical_wiring', 'display_name': 'Electrical Wiring',
     'parent_skill': 'electrical',
     'adjacent_skills': ['circuit_testing', 'panel_installation', 'conduit_running'],
     'category_tags': ['Electrician']},

    {'skill_id': 'high_voltage_wiring', 'display_name': 'High Voltage Wiring',
     'parent_skill': 'electrical_wiring',
     'adjacent_skills': ['electrical_wiring', 'transformer_installation'],
     'category_tags': ['Electrician']},

    {'skill_id': 'carpentry', 'display_name': 'Carpentry',
     'parent_skill': 'woodwork',
     'adjacent_skills': ['joinery', 'furniture_assembly', 'cabinetmaking'],
     'category_tags': ['Carpenter']},

    {'skill_id': 'plastering', 'display_name': 'Plastering',
     'parent_skill': 'masonry',
     'adjacent_skills': ['masonry', 'drywall_finishing', 'rendering'],
     'category_tags': ['Masonry']},

    {'skill_id': 'ac_installation', 'display_name': 'AC Installation',
     'parent_skill': 'hvac',
     'adjacent_skills': ['ac_servicing', 'refrigerant_handling', 'duct_work'],
     'category_tags': ['AC Repair']},

    # Additional MVP skills
    {'skill_id': 'painting', 'display_name': 'Painting',
     'parent_skill': 'finishing',
     'adjacent_skills': ['wall_preparation', 'colour_mixing', 'spray_painting'],
     'category_tags': ['Painter']},

    {'skill_id': 'welding', 'display_name': 'Welding',
     'parent_skill': 'metalwork',
     'adjacent_skills': ['cutting', 'grinding', 'fabrication'],
     'category_tags': ['Welder']},
]


async def seed():
    uri = os.getenv('MONGODB_URI')
    if not uri:
        print('❌ MONGODB_URI not set in .env')
        return

    client = AsyncIOMotorClient(uri, tlsCAFile=certifi.where())
    db_name = os.getenv('MONGO_DB_NAME', 'uncluttered')
    db = client[db_name]

    # Create indexes
    await db.skill_nodes.create_index('skill_id', unique=True)
    await db.skill_nodes.create_index('category_tags')
    await db.skill_nodes.create_index('adjacent_skills')

    await db.graph_edges.create_index([('from_type', 1), ('from_id', 1), ('relationship', 1)])
    await db.graph_edges.create_index([('to_type', 1), ('to_id', 1), ('relationship', 1)])
    await db.graph_edges.create_index([('from_id', 1), ('to_id', 1), ('relationship', 1)], unique=True)

    await db.skill_timeline.create_index([('worker_id', 1), ('skill_id', 1), ('timestamp', -1)])

    print('✅ Created all MongoDB indexes')

    # Seed skill nodes
    for node in SKILL_SEED:
        node.update({'avg_rating': 0.0, 'worker_count': 0, 'job_count': 0})
        await db.skill_nodes.update_one(
            {'skill_id': node['skill_id']},
            {'$setOnInsert': node},
            upsert=True
        )

    print(f'✅ Seeded {len(SKILL_SEED)} skill nodes into {db_name}.skill_nodes')
    client.close()


if __name__ == '__main__':
    asyncio.run(seed())
