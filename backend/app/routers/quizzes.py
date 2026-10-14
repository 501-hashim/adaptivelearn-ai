from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.models import (
    QuizSession,
    QuizSessionQuestion,
    QuizResponse,
    Question,
    Student,
    Subject,
    Chapter,
    Concept,
    ConceptMastery,
    QuizRecommendation,
)
from app.schemas.schemas import (
    QuizCreateRequest,
    QuizSessionOut,
    QuizSaveResponseRequest,
    QuizSubmitRequest,
    QuizResultResponse,
    QuestionClientOut,
    QuestionResultOut,
    QuestionOption,
    ConceptPerformanceSummary,
    QuizHistoryItem,
)
from app.routers.deps import get_current_student
from app.services.adaptive_engine import AdaptiveEngine

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.post("", response_model=QuizSessionOut, status_code=status.HTTP_201_CREATED)
def create_quiz(
    payload: QuizCreateRequest,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    chapter = None
    if payload.chapter_id:
        chapter = db.query(Chapter).filter(Chapter.id == payload.chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")

    # Generate questions using the adaptive engine
    questions = AdaptiveEngine.generate_adaptive_quiz_questions(
        db=db,
        student_id=current_student.id,
        subject_id=payload.subject_id,
        chapter_id=payload.chapter_id,
        requested_count=payload.question_count,
        mode=payload.mode,
        difficulty_preference=payload.difficulty_preference
    )

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active questions available for the selected curriculum scope."
        )

    # Create the session
    session = QuizSession(
        student_id=current_student.id,
        subject_id=payload.subject_id,
        chapter_id=payload.chapter_id,
        mode=payload.mode,
        difficulty_preference=payload.difficulty_preference,
        requested_question_count=payload.question_count,
        actual_question_count=len(questions),
        status="in_progress"
    )
    db.add(session)
    db.flush()

    # Link selected questions with order
    client_questions: List[QuestionClientOut] = []
    for idx, q in enumerate(questions, start=1):
        sq = QuizSessionQuestion(
            session_id=session.id,
            question_id=q.id,
            display_order=idx,
            difficulty_at_selection=q.difficulty
        )
        db.add(sq)

        # Build client safe question representation (no answer key, no explanation!)
        opts = [QuestionOption(id=opt["id"], text=opt["text"]) for opt in q.options]
        client_questions.append(QuestionClientOut(
            id=q.id,
            concept_id=q.concept_id,
            question_text=q.question_text,
            options=opts,
            difficulty=q.difficulty,
            display_order=idx,
            marked_for_review=False,
            current_selected_option=None
        ))

    db.commit()
    db.refresh(session)

    return QuizSessionOut(
        id=session.id,
        subject_id=session.subject_id,
        subject_name=subject.name,
        chapter_id=session.chapter_id,
        chapter_title=chapter.title if chapter else None,
        mode=session.mode,
        difficulty_preference=session.difficulty_preference,
        requested_question_count=session.requested_question_count,
        actual_question_count=session.actual_question_count,
        status=session.status,
        started_at=session.started_at,
        questions=client_questions
    )


@router.get("/history", response_model=List[QuizHistoryItem])
def get_quiz_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    offset = (page - 1) * limit
    sessions = db.query(QuizSession).filter(QuizSession.student_id == current_student.id)\
        .order_by(desc(QuizSession.started_at))\
        .offset(offset).limit(limit).all()

    items = []
    for s in sessions:
        subj = db.query(Subject).filter(Subject.id == s.subject_id).first()
        ch = db.query(Chapter).filter(Chapter.id == s.chapter_id).first() if s.chapter_id else None
        items.append(QuizHistoryItem(
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
    return items


@router.get("/{quiz_id}", response_model=QuizSessionOut)
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    session = db.query(QuizSession).filter(QuizSession.id == quiz_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found")

    # Enforce object-level ownership
    if session.student_id != current_student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this quiz attempt")

    # Fetch ordered questions
    session_questions = db.query(QuizSessionQuestion, Question)\
        .join(Question, QuizSessionQuestion.question_id == Question.id)\
        .filter(QuizSessionQuestion.session_id == session.id)\
        .order_by(QuizSessionQuestion.display_order.asc()).all()

    # Fetch existing responses for in-progress resume
    saved_responses = {
        r.question_id: r for r in db.query(QuizResponse).filter(QuizResponse.session_id == session.id).all()
    }

    client_questions: List[QuestionClientOut] = []
    for sq, q in session_questions:
        resp = saved_responses.get(q.id)
        opts = [QuestionOption(id=opt["id"], text=opt["text"]) for opt in q.options]
        client_questions.append(QuestionClientOut(
            id=q.id,
            concept_id=q.concept_id,
            question_text=q.question_text,
            options=opts,
            difficulty=sq.difficulty_at_selection,
            display_order=sq.display_order,
            marked_for_review=sq.marked_for_review,
            current_selected_option=resp.selected_option if resp else None
        ))

    subject = db.query(Subject).filter(Subject.id == session.subject_id).first()
    chapter = db.query(Chapter).filter(Chapter.id == session.chapter_id).first() if session.chapter_id else None

    return QuizSessionOut(
        id=session.id,
        subject_id=session.subject_id,
        subject_name=subject.name if subject else None,
        chapter_id=session.chapter_id,
        chapter_title=chapter.title if chapter else None,
        mode=session.mode,
        difficulty_preference=session.difficulty_preference,
        requested_question_count=session.requested_question_count,
        actual_question_count=session.actual_question_count,
        status=session.status,
        started_at=session.started_at,
        completed_at=session.completed_at,
        score=session.score,
        time_taken_seconds=session.time_taken_seconds,
        questions=client_questions
    )


@router.put("/{quiz_id}/responses")
def save_response(
    quiz_id: str,
    payload: QuizSaveResponseRequest,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    session = db.query(QuizSession).filter(QuizSession.id == quiz_id).first()
    if not session or session.student_id != current_student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found")

    if session.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot alter responses for completed quiz")

    # Check question belongs to session
    session_q = db.query(QuizSessionQuestion).filter(
        QuizSessionQuestion.session_id == quiz_id,
        QuizSessionQuestion.question_id == payload.question_id
    ).first()
    if not session_q:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question is not part of this quiz session")

    if payload.marked_for_review is not None:
        session_q.marked_for_review = payload.marked_for_review

    # Upsert response record
    response = db.query(QuizResponse).filter(
        QuizResponse.session_id == quiz_id,
        QuizResponse.question_id == payload.question_id
    ).first()

    if not response:
        response = QuizResponse(
            session_id=quiz_id,
            question_id=payload.question_id,
            selected_option=payload.selected_option,
            response_time_seconds=payload.response_time_seconds or 0
        )
        db.add(response)
    else:
        response.selected_option = payload.selected_option
        response.response_time_seconds = payload.response_time_seconds or response.response_time_seconds
        response.answered_at = datetime.now(timezone.utc)

    db.commit()
    return {"message": "Response saved successfully"}


@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    session = db.query(QuizSession).filter(QuizSession.id == quiz_id).first()
    if not session or session.student_id != current_student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found")

    # If already completed, return existing results idempotently
    if session.status == "completed":
        return _build_quiz_result_response(db, session)

    # 1. Fetch valid questions in this session
    session_questions = db.query(QuizSessionQuestion, Question)\
        .join(Question, QuizSessionQuestion.question_id == Question.id)\
        .filter(QuizSessionQuestion.session_id == session.id)\
        .order_by(QuizSessionQuestion.display_order.asc()).all()

    valid_question_map = {q.id: q for _, q in session_questions}

    # 2. Merge submitted payload responses with pre-saved ones
    responses_dict = {
        r.question_id: r.selected_option
        for r in db.query(QuizResponse).filter(QuizResponse.session_id == session.id).all()
    }
    for resp in payload.responses:
        if resp.question_id in valid_question_map:
            responses_dict[resp.question_id] = resp.selected_option

    # 3. Calculate score & correctness transactionally on backend
    correct_count = 0
    total_count = len(session_questions)
    concept_stats = {}  # concept_id -> { "total": 0, "correct": 0, "concept_name": "" }

    for _, q in session_questions:
        selected = responses_dict.get(q.id)
        is_corr = (selected == q.correct_option) if selected else False
        if is_corr:
            correct_count += 1

        # Upsert final response record
        db_resp = db.query(QuizResponse).filter(
            QuizResponse.session_id == session.id,
            QuizResponse.question_id == q.id
        ).first()

        if not db_resp:
            db_resp = QuizResponse(
                session_id=session.id,
                question_id=q.id,
                selected_option=selected,
                is_correct=is_corr,
                answered_at=datetime.now(timezone.utc)
            )
            db.add(db_resp)
        else:
            db_resp.selected_option = selected
            db_resp.is_correct = is_corr
            db_resp.answered_at = datetime.now(timezone.utc)

        # Accumulate stats per concept
        if q.concept_id not in concept_stats:
            concept = db.query(Concept).filter(Concept.id == q.concept_id).first()
            concept_stats[q.concept_id] = {
                "total": 0,
                "correct": 0,
                "name": concept.name if concept else "Concept"
            }
        concept_stats[q.concept_id]["total"] += 1
        if is_corr:
            concept_stats[q.concept_id]["correct"] += 1

        # 4. Update concept mastery records
        AdaptiveEngine.update_concept_mastery(db, current_student.id, q.concept_id, is_corr)

    score_pct = round((correct_count / total_count * 100), 1) if total_count > 0 else 0.0

    session.status = "completed"
    session.score = score_pct
    session.completed_at = datetime.now(timezone.utc)
    session.time_taken_seconds = payload.total_time_seconds or 0

    # 5. Generate recommendations for weak concepts
    for cid, stats in concept_stats.items():
        mastery = AdaptiveEngine.get_student_concept_mastery(db, current_student.id, cid)
        if mastery:
            classification = AdaptiveEngine.classify_mastery(mastery.mastery_score, mastery.attempt_count)
            if classification == "weak":
                rec = QuizRecommendation(
                    student_id=current_student.id,
                    concept_id=cid,
                    recommendation_type="weak_concept",
                    reason=f"Scored {stats['correct']}/{stats['total']} on {stats['name']}. Practice recommended to strengthen foundation."
                )
                db.add(rec)

    db.commit()
    db.refresh(session)

    return _build_quiz_result_response(db, session)


def _build_quiz_result_response(db: Session, session: QuizSession) -> QuizResultResponse:
    session_questions = db.query(QuizSessionQuestion, Question)\
        .join(Question, QuizSessionQuestion.question_id == Question.id)\
        .filter(QuizSessionQuestion.session_id == session.id)\
        .order_by(QuizSessionQuestion.display_order.asc()).all()

    responses = {
        r.question_id: r for r in db.query(QuizResponse).filter(QuizResponse.session_id == session.id).all()
    }

    result_questions: List[QuestionResultOut] = []
    concept_map = {}
    correct_count = 0

    for sq, q in session_questions:
        r = responses.get(q.id)
        is_corr = r.is_correct if r else False
        if is_corr:
            correct_count += 1

        concept = db.query(Concept).filter(Concept.id == q.concept_id).first()
        concept_name = concept.name if concept else "Concept"

        if q.concept_id not in concept_map:
            concept_map[q.concept_id] = {
                "name": concept_name,
                "total": 0,
                "correct": 0
            }
        concept_map[q.concept_id]["total"] += 1
        if is_corr:
            concept_map[q.concept_id]["correct"] += 1

        opts = [QuestionOption(id=opt["id"], text=opt["text"]) for opt in q.options]
        result_questions.append(QuestionResultOut(
            id=q.id,
            concept_id=q.concept_id,
            concept_name=concept_name,
            question_text=q.question_text,
            options=opts,
            correct_option=q.correct_option,
            explanation=q.explanation,
            difficulty=sq.difficulty_at_selection,
            display_order=sq.display_order,
            student_selected_option=r.selected_option if r else None,
            is_correct=is_corr
        ))

    # Build concept performance summaries
    concept_summaries: List[ConceptPerformanceSummary] = []
    identified_gaps: List[str] = []
    recommendations: List[str] = []

    for cid, st in concept_map.items():
        acc = round((st["correct"] / st["total"]) * 100, 1) if st["total"] > 0 else 0.0
        m = AdaptiveEngine.get_student_concept_mastery(db, session.student_id, cid)
        updated_score = m.mastery_score if m else 0.5
        cls_label = AdaptiveEngine.classify_mastery(updated_score, m.attempt_count if m else 0)

        concept_summaries.append(ConceptPerformanceSummary(
            concept_id=cid,
            concept_name=st["name"],
            total_questions=st["total"],
            correct_questions=st["correct"],
            accuracy_percentage=acc,
            updated_mastery=updated_score,
            classification=cls_label
        ))

        if cls_label == "weak" or acc < 50.0:
            identified_gaps.append(f"Learning gap detected in: {st['name']} ({acc}% accuracy)")
            recommendations.append(f"Review foundational theory for {st['name']} and attempt a 5-question targeted adaptive quiz.")

    if not recommendations:
        recommendations.append("Excellent performance! Take a higher-difficulty quiz to maintain retention.")

    total_q = len(session_questions)
    return QuizResultResponse(
        quiz_id=session.id,
        mode=session.mode,
        score=session.score if session.score is not None else 0.0,
        total_questions=total_q,
        correct_count=correct_count,
        incorrect_count=total_q - correct_count,
        time_taken_seconds=session.time_taken_seconds or 0,
        questions=result_questions,
        concept_summaries=concept_summaries,
        identified_gaps=identified_gaps,
        recommendations=recommendations
    )


@router.get("/{quiz_id}/results", response_model=QuizResultResponse)
def get_quiz_results(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student)
):
    session = db.query(QuizSession).filter(QuizSession.id == quiz_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found")

    if session.student_id != current_student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this quiz attempt")

    return _build_quiz_result_response(db, session)

