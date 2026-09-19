from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from models.quiz import Quiz, QuizAttempt, AnswerRecord
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/api/student", tags=["student"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_active_quiz(share_link: str) -> Quiz:
    """Fetch quiz by share link and check expiry."""
    quiz = await Quiz.find_one(Quiz.share_link == share_link)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.status == "expired":
        raise HTTPException(status_code=410, detail="This quiz has expired")
    if quiz.settings.expires_at and datetime.utcnow() > quiz.settings.expires_at:
        quiz.status = "expired"
        await quiz.save()
        raise HTTPException(status_code=410, detail="This quiz has expired")
    return quiz


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CheckRequest(BaseModel):
    email: str


class AnswerSubmit(BaseModel):
    selected: Optional[str] = None


class SubmitRequest(BaseModel):
    studentName: str
    studentEmail: str
    answers: List[AnswerSubmit]
    tabSwitchCount: int = 0
    autoSubmitted: bool = False


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/quiz/{share_link}")
async def get_quiz_for_student(share_link: str):
    """Return quiz without correct answers or explanations."""
    quiz = await get_active_quiz(share_link)

    safe_questions = [
        {
            "index": i,
            "question": q.question,
            "options": q.options,
            "type": q.type,
        }
        for i, q in enumerate(quiz.questions)
    ]

    return {
        "_id": str(quiz.id),
        "title": quiz.title,
        "settings": {
            "timeLimit": quiz.settings.time_limit,
            "questionCount": len(safe_questions),
            "tabSwitchLimit": quiz.settings.tab_switch_limit,
        },
        "questions": safe_questions,
    }


@router.post("/quiz/{share_link}/check")
async def check_attempt(share_link: str, body: CheckRequest):
    """Pre-attempt gate — check if this email has already attempted."""
    if not body.email:
        raise HTTPException(status_code=400, detail="Email is required")

    quiz = await get_active_quiz(share_link)

    existing = await QuizAttempt.find_one(
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.student_email == body.email.lower().strip(),
    )

    return {"attempted": existing is not None}


@router.post("/quiz/{share_link}/submit", status_code=status.HTTP_201_CREATED)
async def submit_quiz(share_link: str, body: SubmitRequest):
    """Submit quiz answers, evaluate, and store attempt."""
    if not body.studentName or not body.studentEmail:
        raise HTTPException(status_code=400, detail="Name and email are required")
    if not body.answers:
        raise HTTPException(status_code=400, detail="Answers array is required")

    quiz = await get_active_quiz(share_link)

    # Check for duplicate attempt
    existing = await QuizAttempt.find_one(
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.student_email == body.studentEmail.lower().strip(),
    )
    if existing:
        raise HTTPException(status_code=403, detail="You have already attempted this quiz")

    # Evaluate answers
    score = 0
    evaluated = []
    for i, q in enumerate(quiz.questions):
        submitted = body.answers[i].selected if i < len(body.answers) else None
        is_correct = submitted == q.correct
        if is_correct:
            score += 1
        evaluated.append({
            "questionIndex": i,
            "selected": submitted,
            "correct": q.correct,
            "isCorrect": is_correct,
            "question": q.question,
            "options": q.options,
            "explanation": q.explanation,
            "type": q.type,
        })

    # Store attempt
    answer_records = [
        AnswerRecord(
            question_index=i,
            selected=(body.answers[i].selected if i < len(body.answers) else None),
        )
        for i in range(len(quiz.questions))
    ]

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_name=body.studentName.strip(),
        student_email=body.studentEmail.lower().strip(),
        answers=answer_records,
        score=score,
        total_questions=len(quiz.questions),
        tab_switch_count=body.tabSwitchCount,
        auto_submitted=body.autoSubmitted,
    )
    try:
        await attempt.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=403, detail="You have already attempted this quiz")

    # Build result based on visibility settings
    result = {
        "attemptId": str(attempt.id),
        "totalQuestions": len(quiz.questions),
        "tabSwitchCount": attempt.tab_switch_count,
        "autoSubmitted": attempt.auto_submitted,
    }

    if quiz.settings.show_score:
        result["score"] = score
        result["percentage"] = round((score / len(quiz.questions)) * 100) if quiz.questions else 0

    if quiz.settings.show_answers:
        result["answers"] = [
            {
                "questionIndex": e["questionIndex"],
                "question": e["question"],
                "options": e["options"],
                "selected": e["selected"],
                "correct": e["correct"],
                "isCorrect": e["isCorrect"],
                "type": e["type"],
                **({"explanation": e["explanation"]} if quiz.settings.show_explanations else {}),
            }
            for e in evaluated
        ]

    result["visibility"] = {
        "showScore": quiz.settings.show_score,
        "showAnswers": quiz.settings.show_answers,
        "showExplanations": quiz.settings.show_explanations,
    }

    return {"message": "Quiz submitted successfully", "result": result}
