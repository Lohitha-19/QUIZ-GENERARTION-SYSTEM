import os
import re
import math
import tempfile
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from beanie import PydanticObjectId
from dotenv import load_dotenv

from models.user import User
from models.quiz import Quiz, QuizAttempt, Question, QuizSettings
from middleware.auth import get_current_user
from parsers.pdf_parser import parse_pdf
from parsers.pptx_parser import parse_pptx
from parsers.docx_parser import parse_docx
from services.classifier import classify_chunks
from services.quiz_generator import generate_questions

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


# ── Text helpers (from ai-service/main.py) ────────────────────────────────────

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
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)

    chunks, current, current_len = [], [], 0
    for sent in sentences:
        words = len(sent.split())
        if current_len + words > chunk_size and current:
            chunks.append(" ".join(current))
            overlap_words = " ".join(current).split()[-overlap:]
            current = [" ".join(overlap_words)]
            current_len = len(overlap_words)
        current.append(sent)
        current_len += words

    if current:
        chunks.append(" ".join(current))

    return [c for c in chunks if len(c.strip()) > 50]


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class UpdateSettingsRequest(BaseModel):
    show_score: Optional[bool] = None
    show_answers: Optional[bool] = None
    show_explanations: Optional[bool] = None
    tab_switch_limit: Optional[int] = None
    expires_at: Optional[datetime] = None
    time_limit: Optional[int] = None
    title: Optional[str] = None
    status: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    request: Request,
    current_user: User = Depends(get_current_user),
    rawText: str = Form(default=""),
    title: Optional[str] = Form(default=None),
    difficulty: str = Form(default="medium"),
    questionCount: int = Form(default=10),
    timeLimit: int = Form(default=10),
    questionType: str = Form(default="mixed"),
    theoryPercent: int = Form(default=50),
    numericalPercent: int = Form(default=25),
    codingPercent: int = Form(default=25),
    showScore: str = Form(default="true"),
    showAnswers: str = Form(default="true"),
    showExplanations: str = Form(default="true"),
    tabSwitchLimit: int = Form(default=3),
    expiresAt: Optional[str] = Form(default=None),
):
    # Manually extract files to support both 'files' and 'files[]'
    form_data = await request.form()
    files = form_data.getlist("files") + form_data.getlist("files[]")

    if not files and not rawText.strip():
        raise HTTPException(
            status_code=400,
            detail="Please upload at least one file or provide text content",
        )

    if questionType == "mixed":
        total_pct = theoryPercent + numericalPercent + codingPercent
        if total_pct != 100:
            theoryPercent = math.floor(theoryPercent * 100 / total_pct)
            numericalPercent = math.floor(numericalPercent * 100 / total_pct)
            codingPercent = 100 - theoryPercent - numericalPercent

    # ── Step 1: Extract text ──────────────────────────────────────────────────
    all_text_parts = []
    tmp_paths = []

    if files:
        for uploaded in files:
            if not uploaded.filename:
                continue
            suffix = os.path.splitext(uploaded.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await uploaded.read()
                tmp.write(content)
                tmp_path = tmp.name
            tmp_paths.append(tmp_path)
            try:
                extracted = extract_text_from_file(tmp_path, uploaded.filename)
                all_text_parts.append(extracted)
            except Exception as e:
                print(f"[quiz_routes] Skipping {uploaded.filename}: {e}")

    if rawText.strip():
        all_text_parts.append(rawText.strip())

    # Clean up temp files
    for tp in tmp_paths:
        try:
            os.unlink(tp)
        except Exception:
            pass

    combined_text = "\n\n".join(all_text_parts)
    if not combined_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any text from provided input",
        )

    # ── Step 2: Chunk & Classify ──────────────────────────────────────────────
    chunks = chunk_text(combined_text)
    classified = classify_chunks(chunks)
    print(
        f"[quiz_routes] Chunks — theory:{len(classified['theory'])} "
        f"numerical:{len(classified['numerical'])} coding:{len(classified['coding'])}"
    )

    # ── Step 3: Generate Questions ────────────────────────────────────────────
    questions_raw = generate_questions(
        classified_chunks=classified,
        question_type=questionType,
        total_count=questionCount,
        theory_pct=theoryPercent,
        numerical_pct=numericalPercent,
        coding_pct=codingPercent,
        difficulty=difficulty,
    )

    if not questions_raw:
        raise HTTPException(
            status_code=500,
            detail="AI failed to generate questions. Check your API key and content.",
        )

    # ── Step 4: Save to DB ────────────────────────────────────────────────────
    question_docs = [
        Question(
            question=q.get("question", ""),
            options=q.get("options", []),
            correct=q.get("correct", "A"),
            explanation=q.get("explanation", ""),
            type=q.get("type", "theory"),
        )
        for q in questions_raw
    ]

    def _bool(val):
        if isinstance(val, bool):
            return val
        return str(val).lower() == "true"

    share_link = str(uuid.uuid4())
    settings = QuizSettings(
        difficulty=difficulty,
        question_count=len(question_docs),
        time_limit=timeLimit,
        question_type=questionType,
        theory_percent=theoryPercent,
        numerical_percent=numericalPercent,
        coding_percent=codingPercent,
        show_score=_bool(showScore),
        show_answers=_bool(showAnswers),
        show_explanations=_bool(showExplanations),
        tab_switch_limit=tabSwitchLimit,
        expires_at=datetime.fromisoformat(expiresAt) if expiresAt else None,
    )

    quiz = Quiz(
        title=title or f"Quiz - {datetime.now().strftime('%Y-%m-%d')}",
        creator_id=current_user.id,
        questions=question_docs,
        settings=settings,
        share_link=share_link,
    )
    await quiz.insert()

    return {
        "message": "Quiz generated successfully",
        "quiz": _serialize_quiz(quiz),
        "shareUrl": f"{FRONTEND_URL}/quiz/{share_link}",
    }


@router.get("/my-quizzes")
async def my_quizzes(current_user: User = Depends(get_current_user)):
    quizzes = await Quiz.find(
        Quiz.creator_id == current_user.id
    ).sort(-Quiz.created_at).to_list()

    return [_serialize_quiz(q, include_questions=False) for q in quizzes]


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str, current_user: User = Depends(get_current_user)):
    try:
        oid = PydanticObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await Quiz.find_one(Quiz.id == oid, Quiz.creator_id == current_user.id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempts = await QuizAttempt.find(
        QuizAttempt.quiz_id == oid
    ).sort(-QuizAttempt.submitted_at).to_list()

    return {
        "quiz": _serialize_quiz(quiz),
        "attempts": [_serialize_attempt(a) for a in attempts],
    }


@router.put("/{quiz_id}/settings")
async def update_settings(
    quiz_id: str,
    body: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        oid = PydanticObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await Quiz.find_one(Quiz.id == oid, Quiz.creator_id == current_user.id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if body.show_score is not None:
        quiz.settings.show_score = body.show_score
    if body.show_answers is not None:
        quiz.settings.show_answers = body.show_answers
    if body.show_explanations is not None:
        quiz.settings.show_explanations = body.show_explanations
    if body.tab_switch_limit is not None:
        quiz.settings.tab_switch_limit = body.tab_switch_limit
    if body.expires_at is not None:
        quiz.settings.expires_at = body.expires_at
    if body.time_limit is not None:
        quiz.settings.time_limit = body.time_limit
    if body.title is not None:
        quiz.title = body.title
    if body.status is not None:
        quiz.status = body.status

    quiz.updated_at = datetime.utcnow()
    await quiz.save()

    return {"message": "Settings updated", "quiz": _serialize_quiz(quiz)}


@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: str, current_user: User = Depends(get_current_user)):
    try:
        oid = PydanticObjectId(quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await Quiz.find_one(Quiz.id == oid, Quiz.creator_id == current_user.id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    await QuizAttempt.find(QuizAttempt.quiz_id == oid).delete()
    await quiz.delete()

    return {"message": "Quiz deleted successfully"}


# ── Serializers ───────────────────────────────────────────────────────────────

def _serialize_quiz(quiz: Quiz, include_questions: bool = True) -> dict:
    data = {
        "_id": str(quiz.id),
        "title": quiz.title,
        "creatorId": str(quiz.creator_id),
        "shareLink": quiz.share_link,
        "status": quiz.status,
        "createdAt": quiz.created_at.isoformat() if quiz.created_at else None,
        "updatedAt": quiz.updated_at.isoformat() if quiz.updated_at else None,
        "settings": {
            "difficulty": quiz.settings.difficulty,
            "questionCount": quiz.settings.question_count,
            "timeLimit": quiz.settings.time_limit,
            "questionType": quiz.settings.question_type,
            "theoryPercent": quiz.settings.theory_percent,
            "numericalPercent": quiz.settings.numerical_percent,
            "codingPercent": quiz.settings.coding_percent,
            "showScore": quiz.settings.show_score,
            "showAnswers": quiz.settings.show_answers,
            "showExplanations": quiz.settings.show_explanations,
            "tabSwitchLimit": quiz.settings.tab_switch_limit,
            "expiresAt": quiz.settings.expires_at.isoformat() if quiz.settings.expires_at else None,
        },
    }
    if include_questions:
        data["questions"] = [
            {
                "question": q.question,
                "options": q.options,
                "correct": q.correct,
                "explanation": q.explanation,
                "type": q.type,
            }
            for q in quiz.questions
        ]
    return data


def _serialize_attempt(attempt: QuizAttempt) -> dict:
    return {
        "_id": str(attempt.id),
        "quizId": str(attempt.quiz_id),
        "studentName": attempt.student_name,
        "studentEmail": attempt.student_email,
        "score": attempt.score,
        "totalQuestions": attempt.total_questions,
        "tabSwitchCount": attempt.tab_switch_count,
        "autoSubmitted": attempt.auto_submitted,
        "submittedAt": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
    }
