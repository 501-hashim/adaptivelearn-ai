from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.db.session import get_db
from app.models.models import (
    Student,
    Subject,
    Chapter,
    Concept,
    ConceptMastery,
    QuizSession,
    QuizRecommendation,
)
from app.schemas.schemas import (
    DashboardSummary,
    ConceptMasteryOut,
    RecommendationOut,
    QuizHistoryItem,
)
from app.routers.deps import get_current_student
from app.services.adaptive_engine import AdaptiveEngine

router = APIRouter(prefix="/students/me", tags=["Student Analytics"])


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    # Total quizzes completed
    completed_sessions = db.query(QuizSession).filter(
        QuizSession.student_id == current_student.id,
        QuizSession.status == "completed"
    ).all()
    total_quizzes = len(completed_sessions)

    # Overall accuracy
    if total_quizzes > 0:
        valid_scores = [s.score for s in completed_sessions if s.score is not None]
        overall_acc = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else 0.0
    else:
        overall_acc = 0.0

    # Concepts classification
    all_masteries = db.query(ConceptMastery, Concept, Chapter, Subject)\
        .join(Concept, ConceptMastery.concept_id == Concept.id)\
        .join(Chapter, Concept.chapter_id == Chapter.id)\
        .join(Subject, Chapter.subject_id == Subject.id)\
        .filter(ConceptMastery.student_id == current_student.id).all()

    weak_list: List[ConceptMasteryOut] = []
    weak_count = 0
    dev_count = 0
    strong_count = 0

    for m, c, ch, sub in all_masteries:
        cls_label = AdaptiveEngine.classify_mastery(m.mastery_score, m.attempt_count)
        if cls_label == "weak":
            weak_count += 1
            weak_list.append(ConceptMasteryOut(
                concept_id=c.id,
                concept_name=c.name,
                chapter_id=ch.id,
                chapter_title=ch.title,
                subject_id=sub.id,
                subject_name=sub.name,
                mastery_score=m.mastery_score,
                attempt_count=m.attempt_count,
                correct_count=m.correct_count,
                classification=cls_label,
                last_practiced_at=m.last_practiced_at
            ))
        elif cls_label == "developing":
            dev_count += 1
        elif cls_label in ["progressing", "strong"]:
            strong_count += 1

    # Recent quizzes (up to 5)
    recent_sessions = db.query(QuizSession).filter(
        QuizSession.student_id == current_student.id
    ).order_by(desc(QuizSession.started_at)).limit(5).all()

    recent_quizzes: List[QuizHistoryItem] = []
    for s in recent_sessions:
        subj = db.query(Subject).filter(Subject.id == s.subject_id).first()
        ch = db.query(Chapter).filter(Chapter.id == s.chapter_id).first() if s.chapter_id else None
        recent_quizzes.append(QuizHistoryItem(
            id=s.id,
            subject_id=s.subject_id,
            subject_name=subj.name if subj else "Subject",
            chapter_id=s.chapter_id,
            chapter_title=ch.title if ch else None,
            mode=s.mode,
            status=s.status,
            score=s.score,
            actual_question_count=s.actual_question_count,
            started_at=s.started_at,
            completed_at=s.completed_at
        ))

    # Recommendations
    db_recs = db.query(QuizRecommendation, Concept, Chapter, Subject)\
        .join(Concept, QuizRecommendation.concept_id == Concept.id)\
        .join(Chapter, Concept.chapter_id == Chapter.id)\
        .join(Subject, Chapter.subject_id == Subject.id)\
        .filter(QuizRecommendation.student_id == current_student.id, QuizRecommendation.completed_at == None)\
        .order_by(desc(QuizRecommendation.created_at)).limit(3).all()

    recs_out: List[RecommendationOut] = []
    for r, c, ch, sub in db_recs:
        recs_out.append(RecommendationOut(
            id=r.id,
            concept_id=c.id,
            concept_name=c.name,
            subject_id=sub.id,
            subject_name=sub.name,
            chapter_id=ch.id,
            chapter_title=ch.title,
            recommendation_type=r.recommendation_type,
            reason=r.reason,
            created_at=r.created_at
        ))

    # Progress timeline: 10 most recent completed quiz dates & scores
    timeline = []
    chronological_quizzes = sorted(
        [s for s in completed_sessions if s.completed_at and s.score is not None],
        key=lambda x: x.completed_at
    )[-10:]
    for s in chronological_quizzes:
        timeline.append({
            "date": s.completed_at.strftime("%b %d"),
            "score": s.score,
            "mode": s.mode
        })

    return DashboardSummary(
        student_id=current_student.id,
        display_name=current_student.display_name,
        grade=current_student.grade,
        total_quizzes_completed=total_quizzes,
        overall_accuracy=overall_acc,
        weak_concepts_count=weak_count,
        developing_concepts_count=dev_count,
        strong_concepts_count=strong_count,
        weak_concepts=weak_list[:5],
        recent_quizzes=recent_quizzes,
        recommendations=recs_out,
        progress_timeline=timeline
    )


@router.get("/mastery", response_model=List[ConceptMasteryOut])
def get_all_concept_mastery(
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    records = db.query(ConceptMastery, Concept, Chapter, Subject)\
        .join(Concept, ConceptMastery.concept_id == Concept.id)\
        .join(Chapter, Concept.chapter_id == Chapter.id)\
        .join(Subject, Chapter.subject_id == Subject.id)\
        .filter(ConceptMastery.student_id == current_student.id)\
        .order_by(ConceptMastery.mastery_score.asc()).all()

    results = []
    for m, c, ch, sub in records:
        cls_label = AdaptiveEngine.classify_mastery(m.mastery_score, m.attempt_count)
        results.append(ConceptMasteryOut(
            concept_id=c.id,
            concept_name=c.name,
            chapter_id=ch.id,
            chapter_title=ch.title,
            subject_id=sub.id,
            subject_name=sub.name,
            mastery_score=m.mastery_score,
            attempt_count=m.attempt_count,
            correct_count=m.correct_count,
            classification=cls_label,
            last_practiced_at=m.last_practiced_at
        ))
    return results


@router.get("/recommendations", response_model=List[RecommendationOut])
def get_recommendations(
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    db_recs = db.query(QuizRecommendation, Concept, Chapter, Subject)\
        .join(Concept, QuizRecommendation.concept_id == Concept.id)\
        .join(Chapter, Concept.chapter_id == Chapter.id)\
        .join(Subject, Chapter.subject_id == Subject.id)\
        .filter(QuizRecommendation.student_id == current_student.id, QuizRecommendation.completed_at == None)\
        .order_by(desc(QuizRecommendation.created_at)).all()

    results = []
    for r, c, ch, sub in db_recs:
        results.append(RecommendationOut(
            id=r.id,
            concept_id=c.id,
            concept_name=c.name,
            subject_id=sub.id,
            subject_name=sub.name,
            chapter_id=ch.id,
            chapter_title=ch.title,
            recommendation_type=r.recommendation_type,
            reason=r.reason,
            created_at=r.created_at
        ))
    return results
