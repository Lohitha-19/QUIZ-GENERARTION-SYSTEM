from typing import Optional, List
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


# ── Embedded schemas ──────────────────────────────────────────────────────────

class Question(BaseModel):
    """A single quiz question — mirrors Mongoose questionSchema."""
    question: str
    options: List[str]          # always 4 items
    correct: str                # "A", "B", "C", or "D"
    explanation: str = ""
    type: str = "theory"        # "theory" | "numerical" | "coding"


class QuizSettings(BaseModel):
    difficulty: str = "medium"           # "easy" | "medium" | "hard"
    question_count: int = 10
    time_limit: int = 10                 # minutes; 0 = no limit
    question_type: str = "mixed"         # "theory" | "numerical" | "coding" | "mixed"
    theory_percent: int = 50
    numerical_percent: int = 25
    coding_percent: int = 25
    show_score: bool = True
    show_answers: bool = True
    show_explanations: bool = True
    tab_switch_limit: int = 3
    expires_at: Optional[datetime] = None


# ── Documents ─────────────────────────────────────────────────────────────────

class Quiz(Document):
    """Quiz document — mirrors Mongoose quizSchema."""

    title: str
    creator_id: Optional[PydanticObjectId] = None
    questions: List[Question] = []
    settings: QuizSettings = Field(default_factory=QuizSettings)
    share_link: Optional[str] = None
    status: str = "active"      # "active" | "expired" | "draft"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "quizzes"


class AnswerRecord(BaseModel):
    """A single answer record inside QuizAttempt."""
    question_index: int
    selected: Optional[str] = None  # "A"/"B"/"C"/"D" or None if skipped


from pymongo import IndexModel, ASCENDING


class QuizAttempt(Document):
    """QuizAttempt document — mirrors Mongoose quizAttemptSchema."""

    quiz_id: PydanticObjectId
    student_name: str
    student_email: str
    answers: List[AnswerRecord] = []
    score: int = 0
    total_questions: int = 0
    tab_switch_count: int = 0
    auto_submitted: bool = False
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "quizattempts"
        indexes = [
            IndexModel([("quiz_id", ASCENDING), ("student_email", ASCENDING)], unique=True),
        ]
