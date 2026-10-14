"""
Adaptive Learning Engine for AdaptiveLearn AI.

Core formula & principles:
1. Laplace Smoothed Accuracy:
   smoothed_accuracy = (correct + 2) / (attempts + 4)
2. Classifications:
   - < 0.50: weak (needs foundational practice, if sufficient attempts)
   - 0.50 - 0.69: developing
   - 0.70 - 0.84: progressing
   - >= 0.85: strong
3. Dynamic Difficulty Adjuster:
   - Level 1 (Easy): for unknown or weak concepts
   - Level 2 (Medium): for developing/progressing concepts
   - Level 3 (Hard): for high-mastery retention
4. Adaptive Quiz Question Selection:
   - Prioritizes weak concepts (60%), developing (20%), retention/breadth (20%)
   - Considers concept prerequisite graph when foundational understanding is weak
   - Strictly prevents question duplicates in the same session
   - Prefers least recently asked questions
"""

import random
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.models import (
    Concept,
    ConceptMastery,
    ConceptPrerequisite,
    Question,
    QuizSession,
    QuizSessionQuestion,
    QuizResponse,
    QuizRecommendation,
)
from app.services.question_generator import question_generator


class AdaptiveEngine:
    @staticmethod
    def calculate_smoothed_mastery(correct_count: int, attempt_count: int) -> float:
        """Calculate Laplace-smoothed accuracy estimate: (correct + 2) / (attempts + 4)."""
        return round((correct_count + 2.0) / (attempt_count + 4.0), 4)

    @classmethod
    def classify_mastery(cls, score: float, attempt_count: int) -> str:
        """Classify mastery level based on configured thresholds and minimum attempts."""
        if attempt_count < settings.MIN_ATTEMPTS_FOR_EVIDENCE:
            return "insufficient_evidence"
        if score < settings.MASTERY_WEAK_THRESHOLD:
            return "weak"
        if score < settings.MASTERY_DEVELOPING_THRESHOLD:
            return "developing"
        if score < settings.MASTERY_PROGRESSING_THRESHOLD:
            return "progressing"
        return "strong"

    @classmethod
    def get_student_concept_mastery(
        cls, db: Session, student_id: str, concept_id: str
    ) -> Optional[ConceptMastery]:
        return db.query(ConceptMastery).filter(
            ConceptMastery.student_id == student_id,
            ConceptMastery.concept_id == concept_id
        ).first()

    @classmethod
    def update_concept_mastery(
        cls, db: Session, student_id: str, concept_id: str, is_correct: bool
    ) -> Tuple[ConceptMastery, float, float]:
        """
        Updates student's concept mastery in the database transaction.
        Returns: (ConceptMastery, previous_score, new_score)
        """
        record = cls.get_student_concept_mastery(db, student_id, concept_id)
        if not record:
            prev_score = 0.5  # Neutral Laplace prior (0+2)/(0+4)
            record = ConceptMastery(
                student_id=student_id,
                concept_id=concept_id,
                attempt_count=1,
                correct_count=1 if is_correct else 0,
                mastery_score=cls.calculate_smoothed_mastery(1 if is_correct else 0, 1),
                last_practiced_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(record)
            new_score = record.mastery_score
        else:
            prev_score = record.mastery_score
            record.attempt_count += 1
            if is_correct:
                record.correct_count += 1
            record.mastery_score = cls.calculate_smoothed_mastery(record.correct_count, record.attempt_count)
            record.last_practiced_at = datetime.now(timezone.utc)
            record.updated_at = datetime.now(timezone.utc)
            new_score = record.mastery_score

        return record, prev_score, new_score

    @classmethod
    def detect_learning_gaps(cls, db: Session, student_id: str, subject_id: Optional[str] = None) -> List[Dict]:
        """
        Identifies concepts with evidence of learning gaps:
        - Low accuracy with >= MIN_ATTEMPTS_FOR_EVIDENCE
        - Inspects prerequisite tree for foundational concepts
        """
        query = db.query(ConceptMastery, Concept).join(Concept, ConceptMastery.concept_id == Concept.id)\
            .filter(ConceptMastery.student_id == student_id)

        if subject_id:
            from app.models.models import Chapter
            query = query.join(Chapter, Concept.chapter_id == Chapter.id).filter(Chapter.subject_id == subject_id)

        records = query.all()
        gaps = []

        for mastery, concept in records:
            classification = cls.classify_mastery(mastery.mastery_score, mastery.attempt_count)
            if classification == "weak":
                # Find prerequisites
                prereqs = db.query(ConceptPrerequisite).filter(ConceptPrerequisite.concept_id == concept.id).all()
                prereq_names = []
                for p in prereqs:
                    prereq_concept = db.query(Concept).filter(Concept.id == p.prerequisite_id).first()
                    if prereq_concept:
                        prereq_names.append(prereq_concept.name)

                gaps.append({
                    "concept_id": concept.id,
                    "concept_name": concept.name,
                    "score": mastery.mastery_score,
                    "attempts": mastery.attempt_count,
                    "correct": mastery.correct_count,
                    "prerequisites": prereq_names,
                    "reason": f"Accuracy is low ({mastery.mastery_score*100:.1f}%) over {mastery.attempt_count} attempts."
                })

        return gaps

    @classmethod
    def generate_adaptive_quiz_questions(
        cls,
        db: Session,
        student_id: str,
        subject_id: str,
        chapter_id: Optional[str],
        requested_count: int,
        mode: str = "practice",
        difficulty_preference: str = "adaptive"
    ) -> List[Question]:
        """
        Intelligently selects questions based on student mastery and learning gaps.
        Enforces:
        - No duplicate questions in session
        - Diagnostic: wide concept coverage with easy/medium difficulty
        - Adaptive: 60% weak, 20% developing, 20% retention/prerequisite review
        - Difficulty tailored to mastery level (Level 1 for weak, Level 2 for developing, Level 3 for strong)
        """
        from app.models.models import Chapter

        # 1. Fetch eligible concepts
        concept_query = db.query(Concept).join(Chapter, Concept.chapter_id == Chapter.id)\
            .filter(Chapter.subject_id == subject_id)
        if chapter_id:
            concept_query = concept_query.filter(Chapter.id == chapter_id)
        
        all_concepts = concept_query.all()
        if not all_concepts:
            return []

        all_concept_ids = [c.id for c in all_concepts]

        # 2. Fetch student's mastery for these concepts
        mastery_map = {}
        mastery_records = db.query(ConceptMastery).filter(
            ConceptMastery.student_id == student_id,
            ConceptMastery.concept_id.in_(all_concept_ids)
        ).all()
        for m in mastery_records:
            mastery_map[m.concept_id] = m

        # 3. Categorize concepts
        weak_concepts = []
        developing_concepts = []
        strong_concepts = []
        unknown_concepts = []

        for c in all_concepts:
            m = mastery_map.get(c.id)
            if not m or m.attempt_count < settings.MIN_ATTEMPTS_FOR_EVIDENCE:
                unknown_concepts.append(c)
            elif m.mastery_score < settings.MASTERY_WEAK_THRESHOLD:
                weak_concepts.append(c)
            elif m.mastery_score < settings.MASTERY_DEVELOPING_THRESHOLD:
                developing_concepts.append(c)
            else:
                strong_concepts.append(c)

        # 4. Determine concept quotas
        selected_questions: List[Question] = []
        used_question_ids = set()

        # Questions already answered recently by student (to prefer unseen questions)
        recent_answered_ids = set(
            r[0] for r in db.query(QuizResponse.question_id).join(QuizSession)\
                .filter(QuizSession.student_id == student_id).all()
        )

        def pick_questions_for_concept(
            concept_id: str,
            target_difficulty: int,
            limit: int,
            gap_reason: Optional[str] = None
        ) -> List[Question]:
            """Helper to pick questions for a concept matching target difficulty first, then fallback."""
            # If AI generation is available and this is targeting a student learning gap, try Gemini generation
            if question_generator.is_available and gap_reason:
                concept_obj = db.query(Concept).filter(Concept.id == concept_id).first()
                if concept_obj:
                    ai_questions = question_generator.generate_questions_for_gap(
                        db=db,
                        concept=concept_obj,
                        target_difficulty=target_difficulty,
                        gap_reason=gap_reason,
                        count=limit
                    )
                    if ai_questions:
                        for q in ai_questions:
                            used_question_ids.add(q.id)
                        return ai_questions[:limit]

            query = db.query(Question).filter(
                Question.concept_id == concept_id,
                Question.is_active == True,
                ~Question.id.in_(used_question_ids) if used_question_ids else True
            )
            candidates = query.all()
            if not candidates and question_generator.is_available:
                # If question bank is exhausted for this concept, generate on-the-fly
                concept_obj = db.query(Concept).filter(Concept.id == concept_id).first()
                if concept_obj:
                    candidates = question_generator.generate_questions_for_gap(
                        db=db,
                        concept=concept_obj,
                        target_difficulty=target_difficulty,
                        gap_reason=gap_reason,
                        count=limit
                    )

            if not candidates:
                return []

            # Sort:
            # 1. Exact match with target difficulty
            # 2. Not recently answered by student
            # 3. Random shuffle among equal score
            def candidate_weight(q: Question):
                diff_match = 0 if q.difficulty == target_difficulty else 1
                unseen = 0 if q.id not in recent_answered_ids else 1
                return (diff_match, unseen, random.random())

            candidates.sort(key=candidate_weight)
            chosen = candidates[:limit]
            for q in chosen:
                used_question_ids.add(q.id)
            return chosen

        # Branching based on quiz mode
        if mode == "diagnostic":
            # Diagnostic: Broad distribution across concepts, difficulty 1 & 2
            concepts_pool = list(all_concepts)
            random.shuffle(concepts_pool)
            while len(selected_questions) < requested_count and concepts_pool:
                concept = concepts_pool.pop(0)
                picked = pick_questions_for_concept(concept.id, target_difficulty=random.choice([1, 2]), limit=1)
                selected_questions.extend(picked)
                if not picked:
                    continue

        else:
            # Practice / Adaptive mode
            # Target allocation: 60% weak, 20% developing, 20% strong/unknown
            target_weak_count = int(round(requested_count * 0.60))
            target_dev_count = int(round(requested_count * 0.20))
            target_other_count = requested_count - (target_weak_count + target_dev_count)

            # 1. Weak concepts (Difficulty 1 / 2)
            for c in weak_concepts:
                if len(selected_questions) >= target_weak_count:
                    break
                m_score = mastery_map.get(c.id).mastery_score if c.id in mastery_map else 0.4
                gap_desc = f"Student mastery is low ({m_score*100:.1f}%) on {c.name}. Requires remedial conceptual practice."

                # Check prerequisites for weak concept
                prereq_links = db.query(ConceptPrerequisite).filter(ConceptPrerequisite.concept_id == c.id).all()
                if prereq_links and random.random() < 0.35:
                    prereq_id = random.choice(prereq_links).prerequisite_id
                    picked_prereq = pick_questions_for_concept(
                        prereq_id,
                        target_difficulty=1,
                        limit=1,
                        gap_reason=f"Foundational prerequisite weakness for {c.name}"
                    )
                    selected_questions.extend(picked_prereq)

                picked = pick_questions_for_concept(
                    c.id,
                    target_difficulty=1,
                    limit=1,
                    gap_reason=gap_desc
                )
                selected_questions.extend(picked)

            # 2. Developing concepts (Difficulty 2)
            dev_target = len(selected_questions) + target_dev_count
            for c in developing_concepts:
                if len(selected_questions) >= dev_target:
                    break
                picked = pick_questions_for_concept(c.id, target_difficulty=2, limit=1)
                selected_questions.extend(picked)

            # 3. Strong & Unknown concepts (Difficulty 2 or 3)
            remaining_needed = requested_count - len(selected_questions)
            other_pool = strong_concepts + unknown_concepts
            random.shuffle(other_pool)
            for c in other_pool:
                if len(selected_questions) >= requested_count:
                    break
                diff = 3 if c in strong_concepts else 1
                picked = pick_questions_for_concept(c.id, target_difficulty=diff, limit=1)
                selected_questions.extend(picked)

        # Fallback if still under requested count: pull any active question from the selected scope
        if len(selected_questions) < requested_count:
            fallback_query = db.query(Question).filter(
                Question.concept_id.in_(all_concept_ids),
                Question.is_active == True,
                ~Question.id.in_(used_question_ids) if used_question_ids else True
            )
            fallbacks = fallback_query.all()
            random.shuffle(fallbacks)
            for q in fallbacks:
                if len(selected_questions) >= requested_count:
                    break
                selected_questions.append(q)
                used_question_ids.add(q.id)

        # Handle user difficulty override preference if specified (easy, medium, hard)
        if difficulty_preference in ["easy", "medium", "hard"]:
            pref_diff = {"easy": 1, "medium": 2, "hard": 3}[difficulty_preference]
            # When explicit preference is requested, prioritize ordering questions matching that difficulty
            selected_questions.sort(key=lambda q: (0 if q.difficulty == pref_diff else 1, random.random()))

        return selected_questions
