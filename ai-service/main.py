import os
import re
import tempfile
import math
from typing import List, Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List, Optional, Annotated

load_dotenv()
import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY")
print("Loaded API Key:", api_key)  # DEBUG

genai.configure(api_key=api_key)

from parsers.pdf_parser import parse_pdf
from parsers.pptx_parser import parse_pptx
from parsers.docx_parser import parse_docx
from services.classifier import classify_chunks
from services.quiz_generator import generate_questions

app = FastAPI(title="Quiz Generator AI Service", version="1.0.0")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"[validation] Errors: {exc.errors()}")
    # Convert errors to string to avoid serialization issues with UploadFile
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": str(exc.errors())},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_file(file_path: str, filename: str) -> str:
    """Dispatch to the correct parser based on file extension."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext in [".pptx", ".ppt"]:
        return parse_pptx(file_path)
    elif ext in [".docx", ".doc"]:
        return parse_docx(file_path)
    else:
        raise ValueError(f"Unsupported format: {ext}")


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 80) -> List[str]:
    """Split text into overlapping chunks by sentence boundaries."""
    # Normalise whitespace
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)

    chunks, current, current_len = [], [], 0
    for sent in sentences:
        words = len(sent.split())
        if current_len + words > chunk_size and current:
            chunks.append(" ".join(current))
            # Keep last `overlap` words for context
            overlap_words = " ".join(current).split()[-overlap:]
            current = [" ".join(overlap_words)]
            current_len = len(overlap_words)
        current.append(sent)
        current_len += words

    if current:
        chunks.append(" ".join(current))

    return [c for c in chunks if len(c.strip()) > 50]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Quiz Generator AI Service"}


@app.post("/generate-quiz")
async def generate_quiz(
    request: Request,
    rawText: str = Form(default=""),
    difficulty: str = Form(default="medium"),
    questionCount: int = Form(default=10),
    questionType: str = Form(default="mixed"),
    theoryPercent: int = Form(default=50),
    numericalPercent: int = Form(default=25),
    codingPercent: int = Form(default=25),
):
    # Manually extract files from form data to avoid Pydantic validation issues with List[UploadFile]
    form_data = await request.form()
    # Handle both 'files' and 'files[]' common naming conventions
    files = form_data.getlist("files") + form_data.getlist("files[]")

    # Validate inputs
    if not files and not rawText.strip():
        raise HTTPException(status_code=400, detail="Provide at least one file or raw text")

    if questionType == "mixed":
        total_pct = theoryPercent + numericalPercent + codingPercent
        if total_pct != 100:
            # Auto-normalise if they don't sum to 100
            theoryPercent = math.floor(theoryPercent * 100 / total_pct)
            numericalPercent = math.floor(numericalPercent * 100 / total_pct)
            codingPercent = 100 - theoryPercent - numericalPercent

    # ── Step 1: Extract text ──────────────────────────────────────────────────
    all_text_parts = []

    if files:
        for uploaded in files:
            if not uploaded.filename:
                continue
            suffix = os.path.splitext(uploaded.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await uploaded.read()
                tmp.write(content)
                tmp_path = tmp.name
            try:
                extracted = extract_text_from_file(tmp_path, uploaded.filename)
                all_text_parts.append(extracted)
            except Exception as e:
                print(f"[main] Skipping {uploaded.filename}: {e}")
            finally:
                os.unlink(tmp_path)

    if rawText.strip():
        all_text_parts.append(rawText.strip())

    combined_text = "\n\n".join(all_text_parts)

    if not combined_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract any text from provided input")

    # ── Step 2: Chunk & Classify ──────────────────────────────────────────────
    chunks = chunk_text(combined_text)
    classified = classify_chunks(chunks)

    print(f"[main] Chunks — theory:{len(classified['theory'])} numerical:{len(classified['numerical'])} coding:{len(classified['coding'])}")

    # ── Step 3: Generate Questions ────────────────────────────────────────────
    questions = generate_questions(
        classified_chunks=classified,
        question_type=questionType,
        total_count=questionCount,
        theory_pct=theoryPercent,
        numerical_pct=numericalPercent,
        coding_pct=codingPercent,
        difficulty=difficulty,
    )

    if not questions:
        raise HTTPException(status_code=500, detail="AI failed to generate questions. Check your API key and content.")

    return {"questions": questions, "total": len(questions)}
