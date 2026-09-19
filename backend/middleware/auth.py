import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from dotenv import load_dotenv

from models.user import User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "quizgen_super_secret_key_2024")
ALGORITHM = "HS256"

security = HTTPBearer()


def create_token(user_id: str) -> str:
    """Create a JWT token valid for 7 days."""
    from datetime import datetime, timedelta
    payload = {
        "id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """FastAPI dependency — verifies the Bearer JWT and returns the User document."""
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authorized — invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    from beanie import PydanticObjectId
    user = await User.get(PydanticObjectId(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized — user not found",
        )

    return user


# Alias used in route dependencies
protect = Depends(get_current_user)
