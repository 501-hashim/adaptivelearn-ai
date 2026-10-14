import pytest
from app.services.question_generator import QuestionValidationPipeline, QuestionGenerationService
from app.models.models import Concept, Question
from app.db.session import SessionLocal


def test_question_validation_pipeline_valid():
    candidate = {
        "question_text": "What is the primary organelle responsible for aerobic cellular respiration in eukaryotic cells?",
        "options": [
            {"id": "A", "text": "Mitochondria"},
            {"id": "B", "text": "Ribosome"},
            {"id": "C", "text": "Endoplasmic Reticulum"},
            {"id": "D", "text": "Golgi Apparatus"}
        ],
        "correct_option": "A",
        "explanation": "Mitochondria generate most of the cell's ATP through oxidative phosphorylation.",
        "difficulty": 2
    }
    is_valid, error = QuestionValidationPipeline.validate_candidate(candidate, existing_texts=[])
    assert is_valid is True
    assert error is None


def test_question_validation_pipeline_missing_field():
    candidate = {
        "question_text": "What is the capital of France?",
        "options": [
            {"id": "A", "text": "Paris"},
            {"id": "B", "text": "Lyon"},
            {"id": "C", "text": "Marseille"},
            {"id": "D", "text": "Nice"}
        ],
        # Missing correct_option
        "explanation": "Paris is the capital."
    }
    is_valid, error = QuestionValidationPipeline.validate_candidate(candidate, existing_texts=[])
    assert is_valid is False
    assert "Missing or empty required field" in error


def test_question_validation_pipeline_duplicate_options():
    candidate = {
        "question_text": "What is the chemical formula for water in liquid form?",
        "options": [
            {"id": "A", "text": "H2O"},
            {"id": "B", "text": "H2O"},  # duplicate text
            {"id": "C", "text": "CO2"},
            {"id": "D", "text": "NaCl"}
        ],
        "correct_option": "A",
        "explanation": "Water is composed of two hydrogen atoms and one oxygen atom.",
        "difficulty": 1
    }
    is_valid, error = QuestionValidationPipeline.validate_candidate(candidate, existing_texts=[])
    assert is_valid is False
    assert "Duplicate option text" in error


def test_question_validation_pipeline_invalid_option_key():
    candidate = {
        "question_text": "Which particle has a positive electrical charge?",
        "options": [
            {"id": "A", "text": "Proton"},
            {"id": "B", "text": "Electron"},
            {"id": "C", "text": "Neutron"},
            {"id": "E", "text": "Positron"}  # E instead of D
        ],
        "correct_option": "A",
        "explanation": "Protons have a positive elementary charge.",
        "difficulty": 1
    }
    is_valid, error = QuestionValidationPipeline.validate_candidate(candidate, existing_texts=[])
    assert is_valid is False
    assert "Invalid option identifier" in error


def test_question_validation_pipeline_duplicate_question():
    existing = ["What is photosynthesis and where does it occur?"]
    candidate = {
        "question_text": "What is photosynthesis and where does it occur?",
        "options": [
            {"id": "A", "text": "In chloroplasts"},
            {"id": "B", "text": "In mitochondria"},
            {"id": "C", "text": "In nucleus"},
            {"id": "D", "text": "In ribosomes"}
        ],
        "correct_option": "A",
        "explanation": "Photosynthesis takes place in chloroplasts containing chlorophyll pigments.",
        "difficulty": 1
    }
    is_valid, error = QuestionValidationPipeline.validate_candidate(candidate, existing_texts=existing)
    assert is_valid is False
    assert "Duplicate question text detected" in error


def test_generator_graceful_fallback_when_unconfigured():
    service = QuestionGenerationService()
    db = SessionLocal()
    try:
        concept = db.query(Concept).first()
        assert concept is not None
        # Service should return empty list gracefully without throwing an exception
        result = service.generate_questions_for_gap(db, concept, target_difficulty=1, gap_reason="Low mastery")
        assert isinstance(result, list)
    finally:
        db.close()
