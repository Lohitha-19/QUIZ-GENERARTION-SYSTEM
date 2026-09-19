import os
import hashlib
import secrets
from datetime import datetime, timedelta

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
import bcrypt
from dotenv import load_dotenv

from models.user import User
from middleware.auth import create_token, get_current_user

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_password(password: str) -> str:
    """Hash password with bcrypt, safely truncating to 72 bytes."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password with bcrypt, safely handling 72-byte limit."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False

EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASS = os.getenv("EMAIL_PASS", "")
CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:3000")


# ── Pydantic request/response schemas ─────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    password: str


# ── Helper ────────────────────────────────────────────────────────────────────

async def send_reset_email(user: User, reset_url: str):
    """Send password reset email via Gmail SMTP."""
    html_body = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto;
                background: #0f1117; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 40px; text-align: center;">
        <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px;
                    display: inline-flex; align-items: center; justify-content: center;
                    font-size: 24px; font-weight: 800; color: white; margin-bottom: 12px;">Q</div>
        <h1 style="color: white; margin: 0; font-size: 22px;">Password Reset</h1>
      </div>
      <div style="padding: 40px;">
        <p style="margin-top: 0;">Hi <strong>{user.name}</strong>,</p>
        <p>We received a request to reset your QuizGen AI password. Click the button below to set
           a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{reset_url}"
             style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
                    padding: 14px 32px; border-radius: 8px; text-decoration: none;
                    font-weight: 600; font-size: 15px; display: inline-block;">
            Reset My Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #475569; font-size: 12px; margin: 0;">
          If the button doesn't work, copy and paste this link:<br/>
          <a href="{reset_url}" style="color: #6366f1; word-break: break-all;">{reset_url}</a>
        </p>
      </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset Request — QuizGen AI"
    msg["From"] = f'"QuizGen AI" <{EMAIL_USER}>'
    msg["To"] = user.email
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=EMAIL_USER,
            password=EMAIL_PASS,
        )
    except Exception as e:
        print(f"[auth] Email send failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reset email")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    if not body.name or not body.email or not body.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(body.password)
    user = User(name=body.name, email=body.email, password=hashed)
    await user.insert()

    return {
        "_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "token": create_token(str(user.id)),
    }


@router.post("/login")
async def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = await User.find_one(User.email == body.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.password:
        raise HTTPException(status_code=401, detail="Please reset your password to login")

    if not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "token": create_token(str(user.id)),
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "_id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    if not body.email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await User.find_one(User.email == body.email)

    # Always return success to prevent email enumeration attacks
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    # Generate a secure random token
    reset_token = secrets.token_hex(32)
    hashed_token = hashlib.sha256(reset_token.encode()).hexdigest()

    user.reset_password_token = hashed_token
    user.reset_password_expires = datetime.utcnow() + timedelta(hours=1)
    await user.save()

    reset_url = f"{CLIENT_URL}/teacher/reset-password/{reset_token}"
    await send_reset_email(user, reset_url)

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password/{token}")
async def reset_password(token: str, body: ResetPasswordRequest):
    if not body.password or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed_token = hashlib.sha256(token.encode()).hexdigest()

    user = await User.find_one(
        User.reset_password_token == hashed_token,
        User.reset_password_expires > datetime.utcnow(),
    )

    if not user:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")

    user.password = hash_password(body.password)
    user.reset_password_token = None
    user.reset_password_expires = None
    await user.save()

    return {"message": "Password reset successful. You can now log in."}
