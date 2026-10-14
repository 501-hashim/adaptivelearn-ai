import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_uuid():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    display_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    grade = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    quiz_sessions = relationship("QuizSession", back_populates="student", cascade="all, delete-orphan")
    mastery_records = relationship("ConceptMastery", back_populates="student", cascade="all, delete-orphan")
    recommendations = relationship("QuizRecommendation", back_populates="student", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    grade = Column(Integer, nullable=False, index=True)
    syllabus_version = Column(String(50), default="Standard-2026")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    chapters = relationship("Chapter", back_populates="subject", cascade="all, delete-orphan")
    quiz_sessions = relationship("QuizSession", back_populates="subject")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    sequence_no = Column(Integer, default=1)

    subject = relationship("Subject", back_populates="chapters")
    concepts = relationship("Concept", back_populates="chapter", cascade="all, delete-orphan")
    quiz_sessions = relationship("QuizSession", back_populates="chapter")


class ConceptPrerequisite(Base):
    __tablename__ = "concept_prerequisites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    concept_id = Column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    prerequisite_id = Column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("concept_id", "prerequisite_id", name="uq_concept_prerequisite"),
    )


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    learning_objective = Column(Text, nullable=True)

    chapter = relationship("Chapter", back_populates="concepts")
    questions = relationship("Question", back_populates="concept", cascade="all, delete-orphan")
    mastery_records = relationship("ConceptMastery", back_populates="concept", cascade="all, delete-orphan")
    recommendations = relationship("QuizRecommendation", back_populates="concept", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    concept_id = Column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    # options format: [{"id": "A", "text": "Option 1"}, {"id": "B", "text": "Option 2"}, ...]
    options = Column(JSON, nullable=False)
    correct_option = Column(String(10), nullable=False)  # "A", "B", "C", "D"
    explanation = Column(Text, nullable=False)
    difficulty = Column(Integer, nullable=False, default=1)  # 1: Easy, 2: Medium, 3: Hard
    source_reference = Column(String(200), default="AdaptiveLearn Question Bank")
    is_verified = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    concept = relationship("Concept", back_populates="questions")
    session_questions = relationship("QuizSessionQuestion", back_populates="question")
    responses = relationship("QuizResponse", back_populates="question")


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id"), nullable=False, index=True)
    chapter_id = Column(String(36), ForeignKey("chapters.id"), nullable=True, index=True)
    mode = Column(String(20), nullable=False, default="practice")  # "diagnostic", "practice", "adaptive"
    difficulty_preference = Column(String(20), default="adaptive")  # "adaptive", "easy", "medium", "hard"
    requested_question_count = Column(Integer, default=10)
    actual_question_count = Column(Integer, default=10)
    status = Column(String(20), default="in_progress")  # "in_progress", "completed"
    started_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)  # Percentage score 0 - 100
    time_taken_seconds = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="quiz_sessions")
    subject = relationship("Subject", back_populates="quiz_sessions")
    chapter = relationship("Chapter", back_populates="quiz_sessions")
    session_questions = relationship("QuizSessionQuestion", back_populates="session", cascade="all, delete-orphan", order_by="QuizSessionQuestion.display_order")
    responses = relationship("QuizResponse", back_populates="session", cascade="all, delete-orphan")


class QuizSessionQuestion(Base):
    __tablename__ = "quiz_session_questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    display_order = Column(Integer, nullable=False)
    difficulty_at_selection = Column(Integer, nullable=False, default=1)
    marked_for_review = Column(Boolean, default=False)

    session = relationship("QuizSession", back_populates="session_questions")
    question = relationship("Question", back_populates="session_questions")

    __table_args__ = (
        UniqueConstraint("session_id", "question_id", name="uq_session_question"),
    )


class QuizResponse(Base):
    __tablename__ = "quiz_responses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option = Column(String(10), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    response_time_seconds = Column(Integer, default=0)
    answered_at = Column(DateTime, default=utc_now)

    session = relationship("QuizSession", back_populates="responses")
    question = relationship("Question", back_populates="responses")

    __table_args__ = (
        UniqueConstraint("session_id", "question_id", name="uq_session_response_per_question"),
    )


class ConceptMastery(Base):
    __tablename__ = "concept_mastery"

    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    concept_id = Column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), primary_key=True)
    mastery_score = Column(Float, nullable=False, default=0.5)  # Range 0.0 to 1.0 (Laplace smoothed)
    attempt_count = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    last_practiced_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    student = relationship("Student", back_populates="mastery_records")
    concept = relationship("Concept", back_populates="mastery_records")


class QuizRecommendation(Base):
    __tablename__ = "quiz_recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    concept_id = Column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    recommendation_type = Column(String(50), nullable=False)  # "weak_concept", "prerequisite_review", "retention_check"
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="recommendations")
    concept = relationship("Concept", back_populates="recommendations")
