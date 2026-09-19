from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import EmailStr, Field
from pymongo import IndexModel, ASCENDING


class User(Document):
    """User document — mirrors the Mongoose User schema."""

    name: str
    email: EmailStr
    password: Optional[str] = None
    role: str = "teacher"
    reset_password_token: Optional[str] = None
    reset_password_expires: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
        ]
