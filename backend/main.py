import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    print("[OK] Gemini API configured")
else:
    print("[WARN] GEMINI_API_KEY not set")

from config.database import connect_db, close_db
from routes.auth_routes import router as auth_router
from routes.quiz_routes import router as quiz_router
from routes.student_routes import router as student_router


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db(app)
    yield
    await close_db(app)


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Quiz Generator API",
    version="2.0.0",
    description="Unified Python backend — auth, quiz management, and Gemini AI generation.",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.exceptions import HTTPException as StarletteHTTPException

# ── Exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail, "detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0]["msg"] if exc.errors() else "Validation error"
    print(f"[validation] Errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"message": first_error, "detail": "Validation error", "errors": str(exc.errors())},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[error] {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": str(exc) or "Internal Server Error", "detail": str(exc)},
    )

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(quiz_router)
app.include_router(student_router)

# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "OK", "message": "Quiz Generator API running"}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
