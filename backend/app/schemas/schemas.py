from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"



# ---------------- Auth & Student Schemas ----------------
class StudentRegister(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)
    grade: int = Field(..., ge=1, le=12)


class StudentLogin(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str


class StudentOut(BaseModel):
    id: str
    display_name: str
    email: str
    grade: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: StudentOut


# ---------------- Curriculum Schemas ----------------
class ConceptPrerequisiteOut(BaseModel):
    id: str
    concept_id: str
    prerequisite_id: str

    class Config:
        from_attributes = True


class ConceptOut(BaseModel):
    id: str
    chapter_id: str
    name: str
    description: Optional[str] = None
    learning_objective: Optional[str] = None
    question_count: Optional[int] = 0
    mastery_score: Optional[float] = None
    mastery_status: Optional[str] = "unknown"  # "unknown", "weak", "developing", "progressing", "strong"

    class Config:
        from_attributes = True


class ChapterOut(BaseModel):
    id: str
    subject_id: str
    title: str
    description: Optional[str] = None
    sequence_no: int
    concepts_count: Optional[int] = 0
    questions_count: Optional[int] = 0
    mastery_percentage: Optional[float] = None

    class Config:
        from_attributes = True


class SubjectOut(BaseModel):
    id: str
    name: str
    grade: int
    syllabus_version: str
    description: Optional[str] = None
    chapters_count: Optional[int] = 0
    mastery_percentage: Optional[float] = None
    weak_concepts_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ---------------- Question & Option Schemas ----------------
class QuestionOption(BaseModel):
    id: str  # "A", "B", "C", "D"
    text: str


class QuestionClientOut(BaseModel):
    """Question schema sent during active quiz - NO correct option or explanation!"""
    id: str
    concept_id: str
    question_text: str
    options: List[QuestionOption]
    difficulty: int
    display_order: int
    marked_for_review: bool = False
    current_selected_option: Optional[str] = None

    class Config:
        from_attributes = True


class QuestionResultOut(BaseModel):
    """Question schema returned after quiz completion with full explanation and answer key"""
    id: str
    concept_id: str
    concept_name: Optional[str] = None
    question_text: str
    options: List[QuestionOption]
    correct_option: str
    explanation: str
    difficulty: int
    display_order: int
    student_selected_option: Optional[str] = None
    is_correct: Optional[bool] = None

    class Config:
        from_attributes = True


# ---------------- Quiz Session Schemas ----------------
class QuizCreateRequest(BaseModel):
    subject_id: str
    chapter_id: Optional[str] = None
    mode: str = Field(default="practice", pattern="^(diagnostic|practice|adaptive)$")
    question_count: int = Field(default=10, ge=5, le=15)
    difficulty_preference: str = Field(default="adaptive", pattern="^(adaptive|easy|medium|hard)$")


class QuizSaveResponseRequest(BaseModel):
    question_id: str
    selected_option: Optional[str] = None
    marked_for_review: Optional[bool] = False
    response_time_seconds: Optional[int] = 0


class QuizSubmitRequest(BaseModel):
    responses: List[QuizSaveResponseRequest] = []
    total_time_seconds: Optional[int] = 0


class ConceptPerformanceSummary(BaseModel):
    concept_id: str
    concept_name: str
    total_questions: int
    correct_questions: int
    accuracy_percentage: float
    previous_mastery: Optional[float] = None
    updated_mastery: float
    classification: str  # "weak", "developing", "progressing", "strong", "insufficient_evidence"


class QuizResultResponse(BaseModel):
    quiz_id: str
    mode: str
    score: float
    total_questions: int
    correct_count: int
    incorrect_count: int
    time_taken_seconds: Optional[int] = 0
    questions: List[QuestionResultOut]
    concept_summaries: List[ConceptPerformanceSummary]
    identified_gaps: List[str]
    recommendations: List[str]


class QuizSessionOut(BaseModel):
    id: str
    subject_id: str
    subject_name: Optional[str] = None
    chapter_id: Optional[str] = None
    chapter_title: Optional[str] = None
    mode: str
    difficulty_preference: str
    requested_question_count: int
    actual_question_count: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None
    time_taken_seconds: Optional[int] = None
    questions: List[QuestionClientOut] = []

    class Config:
        from_attributes = True


class QuizHistoryItem(BaseModel):
    id: str
    subject_id: str
    subject_name: str
    chapter_id: Optional[str] = None
    chapter_title: Optional[str] = None
    mode: str
    status: str
    score: Optional[float] = None
    actual_question_count: int
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------- Student Progress & Dashboard Schemas ----------------
class ConceptMasteryOut(BaseModel):
    concept_id: str
    concept_name: str
    chapter_id: str
    chapter_title: str
    subject_id: str
    subject_name: str
    mastery_score: float
    attempt_count: int
    correct_count: int
    classification: str
    last_practiced_at: datetime

    class Config:
        from_attributes = True


class RecommendationOut(BaseModel):
    id: str
    concept_id: str
    concept_name: str
    subject_id: str
    subject_name: str
    chapter_id: str
    chapter_title: str
    recommendation_type: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    student_id: str
    display_name: str
    grade: int
    total_quizzes_completed: int
    overall_accuracy: float
    weak_concepts_count: int
    developing_concepts_count: int
    strong_concepts_count: int
    weak_concepts: List[ConceptMasteryOut]
    recent_quizzes: List[QuizHistoryItem]
    recommendations: List[RecommendationOut]
    progress_timeline: List[dict]  # Date and accuracy trends


# ---------------- AI Generation Schemas (Optional) ----------------
class AICandidateQuestion(BaseModel):
    question_text: str = Field(..., min_length=10)
    options: List[QuestionOption] = Field(..., min_length=4, max_length=4)
    correct_option: str = Field(..., pattern="^[A-D]$")
    explanation: str = Field(..., min_length=10)
    difficulty: int = Field(default=2, ge=1, le=3)
    concept_id: str
    source_reference: Optional[str] = "AI Generated - Pending Verification"
