"""
Database seed script for AdaptiveLearn AI.
Imports:
- Subjects (Grade 8 Math & Science)
- Chapters
- Concepts
- Prerequisite relationships
- 101 Verified MCQs with options, explanations, and difficulty levels
- Sample student account for immediate testing

Idempotent: Safe to re-run multiple times without duplicate records.
"""

import os
import sys
import json
import logging

# Ensure backend root is in sys.path regardless of execution working directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal, Base, engine
from app.models.models import (
    Subject,
    Chapter,
    Concept,
    ConceptPrerequisite,
    Question,
    Student,
)
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


def find_data_file(filename: str) -> str:
    """Finds curriculum seed or verified question files across possible deployment locations."""
    candidates = [
        # Inside backend/data
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", filename),
        # In repository root /data
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", filename),
        # Relative to working directories
        os.path.join(os.getcwd(), "data", filename),
        os.path.join(os.getcwd(), "backend", "data", filename),
        os.path.join(os.getcwd(), "..", "data", filename),
        # Common cloud container paths (e.g. Render, Azure)
        os.path.join("/opt/render/project/src/data", filename),
        os.path.join("/opt/render/project/src/backend/data", filename),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f"Could not locate {filename} in any of: {candidates}")


def seed_data(reset: bool = False):
    db = SessionLocal()
    try:
        if reset:
            logger.info("Resetting tables...")
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        else:
            Base.metadata.create_all(bind=engine)

        # 1. Seed demo student
        demo_email = "student@adaptivelearn.ai"
        existing_student = db.query(Student).filter(Student.email == demo_email).first()
        if not existing_student:
            demo_student = Student(
                display_name="Alex Johnson",
                email=demo_email,
                password_hash=get_password_hash("Password123!"),
                grade=8,
                is_active=True
            )
            db.add(demo_student)
            db.commit()
            logger.info(f"Created demo student: {demo_email} (Password: Password123!)")

        # 2. Load curriculum outline
        curriculum_file = find_data_file("curriculum_seed.json")
        logger.info(f"Loading curriculum from: {curriculum_file}")
        with open(curriculum_file, "r") as f:
            curriculum_data = json.load(f)

        concept_prereq_map = {}

        for subj_data in curriculum_data["subjects"]:
            subject = db.query(Subject).filter(Subject.id == subj_data["id"]).first()
            if not subject:
                subject = Subject(
                    id=subj_data["id"],
                    name=subj_data["name"],
                    grade=subj_data["grade"],
                    syllabus_version=subj_data["syllabus_version"],
                    description=subj_data["description"]
                )
                db.add(subject)
                db.flush()

            for ch_data in subj_data["chapters"]:
                chapter = db.query(Chapter).filter(Chapter.id == ch_data["id"]).first()
                if not chapter:
                    chapter = Chapter(
                        id=ch_data["id"],
                        subject_id=subject.id,
                        title=ch_data["title"],
                        description=ch_data["description"],
                        sequence_no=ch_data["sequence_no"]
                    )
                    db.add(chapter)
                    db.flush()

                for c_data in ch_data["concepts"]:
                    concept = db.query(Concept).filter(Concept.id == c_data["id"]).first()
                    if not concept:
                        concept = Concept(
                            id=c_data["id"],
                            chapter_id=chapter.id,
                            name=c_data["name"],
                            description=c_data["description"],
                            learning_objective=c_data["learning_objective"]
                        )
                        db.add(concept)
                        db.flush()

                    if c_data.get("prerequisites"):
                        concept_prereq_map[c_data["id"]] = c_data["prerequisites"]

        db.commit()
        logger.info("Curriculum structure seeded.")

        # 3. Seed prerequisites
        for cid, prereq_ids in concept_prereq_map.items():
            for pid in prereq_ids:
                existing_p = db.query(ConceptPrerequisite).filter(
                    ConceptPrerequisite.concept_id == cid,
                    ConceptPrerequisite.prerequisite_id == pid
                ).first()
                if not existing_p:
                    cp = ConceptPrerequisite(concept_id=cid, prerequisite_id=pid)
                    db.add(cp)
        db.commit()

        # 4. Seed verified questions
        questions_file = find_data_file("verified_questions.json")
        logger.info(f"Loading questions from: {questions_file}")
        with open(questions_file, "r") as f:
            questions_data = json.load(f)

        added_q_count = 0
        for q in questions_data:
            existing_q = db.query(Question).filter(
                Question.concept_id == q["concept_id"],
                Question.question_text == q["question_text"]
            ).first()
            if not existing_q:
                new_q = Question(
                    concept_id=q["concept_id"],
                    question_text=q["question_text"],
                    options=q["options"],
                    correct_option=q["correct_option"],
                    explanation=q["explanation"],
                    difficulty=q["difficulty"],
                    source_reference=q["source_reference"],
                    is_verified=True,
                    is_active=True
                )
                db.add(new_q)
                added_q_count += 1

        db.commit()
        logger.info(f"Verified questions seeded: {added_q_count} new questions added.")

        total_questions = db.query(Question).count()
        logger.info(f"Total active questions in bank: {total_questions}")

    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    should_reset = "--reset" in sys.argv
    seed_data(reset=should_reset)
