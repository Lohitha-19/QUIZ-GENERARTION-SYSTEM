import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/quizgen")


async def connect_db(app):
    """Initialize MongoDB connection and Beanie ODM."""
    # Import models here to avoid circular imports
    from models.user import User
    from models.quiz import Quiz, QuizAttempt

    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_default_database()

    await init_beanie(
        database=db,
        document_models=[User, Quiz, QuizAttempt],
        allow_index_dropping=True,
    )
    print(f"[OK] MongoDB connected: {MONGO_URI}")
    app.state.mongo_client = client


async def close_db(app):
    """Close MongoDB connection."""
    if hasattr(app.state, "mongo_client"):
        app.state.mongo_client.close()
        print("[OK] MongoDB connection closed")
