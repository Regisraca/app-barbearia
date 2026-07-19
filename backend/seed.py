"""
Seed script to create initial admin user and sample data
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]

    # Check if admin exists
    admin_email = "admin@barberbook.com"
    existing = await db.users.find_one({"email": admin_email})
    
    if existing:
        print(f"Admin already exists: {admin_email}")
    else:
        admin_user = {
            "email": admin_email,
            "password": pwd_context.hash("admin123"),
            "name": "Administrador",
            "phone": "(11) 99999-9999",
            "role": "admin",
            "created_at": datetime.utcnow()
        }
        result = await db.users.insert_one(admin_user)
        print(f"Admin created: {admin_email} / admin123")
        print(f"Admin ID: {result.inserted_id}")

    # Seed sample services if none exist
    services_count = await db.services.count_documents({})
    if services_count == 0:
        sample_services = [
            {
                "name": "Corte de Cabelo",
                "description": "Corte moderno e estiloso",
                "price": 35.00,
                "duration_minutes": 30,
                "created_at": datetime.utcnow()
            },
            {
                "name": "Barba",
                "description": "Aparar e modelar barba",
                "price": 25.00,
                "duration_minutes": 20,
                "created_at": datetime.utcnow()
            },
            {
                "name": "Corte + Barba",
                "description": "Combo completo",
                "price": 55.00,
                "duration_minutes": 45,
                "created_at": datetime.utcnow()
            },
            {
                "name": "Sobrancelha",
                "description": "Design de sobrancelha",
                "price": 15.00,
                "duration_minutes": 15,
                "created_at": datetime.utcnow()
            }
        ]
        await db.services.insert_many(sample_services)
        print(f"Created {len(sample_services)} sample services")
    else:
        print(f"Services already exist ({services_count})")

    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
