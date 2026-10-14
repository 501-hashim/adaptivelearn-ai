from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.models import Subject, Chapter, Concept, Question, ConceptMastery, Student
from app.schemas.schemas import SubjectOut, ChapterOut, ConceptOut
from app.routers.deps import get_current_student
from app.services.adaptive_engine import AdaptiveEngine

router = APIRouter(tags=["Curriculum"])


@router.get("/subjects", response_model=List[SubjectOut])
def get_subjects(
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    # Only return subjects matching the student's enrolled grade
    subjects = db.query(Subject).filter(
        Subject.grade == current_student.grade,
        Subject.is_active == True
    ).all()

    # Fallback to all active curriculum subjects if no grade-specific subjects exist
    if not subjects:
        subjects = db.query(Subject).filter(Subject.is_active == True).all()

    results = []
    for s in subjects:
        # Calculate chapters count
        chapters_count = db.query(func.count(Chapter.id)).filter(Chapter.subject_id == s.id).scalar() or 0
        
        # Calculate average mastery percentage for this subject if data exists
        masteries = db.query(ConceptMastery.mastery_score, ConceptMastery.attempt_count)\
            .join(Concept, ConceptMastery.concept_id == Concept.id)\
            .join(Chapter, Concept.chapter_id == Chapter.id)\
            .filter(
                Chapter.subject_id == s.id,
                ConceptMastery.student_id == current_student.id
            ).all()

        mastery_pct = None
        weak_count = 0
        if masteries:
            total_score = sum(m[0] for m in masteries)
            mastery_pct = round((total_score / len(masteries)) * 100, 1)
            for m in masteries:
                if AdaptiveEngine.classify_mastery(m[0], m[1]) == "weak":
                    weak_count += 1

        results.append(SubjectOut(
            id=s.id,
            name=s.name,
            grade=s.grade,
            syllabus_version=s.syllabus_version,
            description=s.description,
            chapters_count=chapters_count,
            mastery_percentage=mastery_pct,
            weak_concepts_count=weak_count
        ))

    return results


@router.get("/subjects/{subject_id}/chapters", response_model=List[ChapterOut])
def get_chapters(
    subject_id: str,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    chapters = db.query(Chapter).filter(Chapter.subject_id == subject_id)\
        .order_by(Chapter.sequence_no.asc()).all()

    results = []
    for c in chapters:
        concepts_count = db.query(func.count(Concept.id)).filter(Concept.chapter_id == c.id).scalar() or 0
        questions_count = db.query(func.count(Question.id))\
            .join(Concept, Question.concept_id == Concept.id)\
            .filter(Concept.chapter_id == c.id, Question.is_active == True).scalar() or 0

        # Calculate mastery across chapter concepts
        chapter_masteries = db.query(ConceptMastery.mastery_score)\
            .join(Concept, ConceptMastery.concept_id == Concept.id)\
            .filter(
                Concept.chapter_id == c.id,
                ConceptMastery.student_id == current_student.id
            ).all()

        mastery_pct = None
        if chapter_masteries:
            avg_m = sum(m[0] for m in chapter_masteries) / len(chapter_masteries)
            mastery_pct = round(avg_m * 100, 1)

        results.append(ChapterOut(
            id=c.id,
            subject_id=c.subject_id,
            title=c.title,
            description=c.description,
            sequence_no=c.sequence_no,
            concepts_count=concepts_count,
            questions_count=questions_count,
            mastery_percentage=mastery_pct
        ))

    return results


@router.get("/chapters/{chapter_id}/concepts", response_model=List[ConceptOut])
def get_concepts(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")

    concepts = db.query(Concept).filter(Concept.chapter_id == chapter_id).all()
    results = []
    for cp in concepts:
        q_count = db.query(func.count(Question.id))\
            .filter(Question.concept_id == cp.id, Question.is_active == True).scalar() or 0

        mastery = db.query(ConceptMastery).filter(
            ConceptMastery.concept_id == cp.id,
            ConceptMastery.student_id == current_student.id
        ).first()

        score = mastery.mastery_score if mastery else None
        status_label = AdaptiveEngine.classify_mastery(score or 0.5, mastery.attempt_count if mastery else 0) if mastery else "unknown"

        results.append(ConceptOut(
            id=cp.id,
            chapter_id=cp.chapter_id,
            name=cp.name,
            description=cp.description,
            learning_objective=cp.learning_objective,
            question_count=q_count,
            mastery_score=score,
            mastery_status=status_label
        ))

    return results
