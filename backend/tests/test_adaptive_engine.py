import pytest
from app.services.adaptive_engine import AdaptiveEngine


def test_smoothed_mastery_calculation():
    # Laplace smoothing formula: (correct + 2) / (attempts + 4)
    # 0 attempts, 0 correct -> 2/4 = 0.50
    assert AdaptiveEngine.calculate_smoothed_mastery(0, 0) == 0.50

    # 1 attempt, 1 correct -> (1 + 2) / (1 + 4) = 3/5 = 0.60
    assert AdaptiveEngine.calculate_smoothed_mastery(1, 1) == 0.60

    # 1 attempt, 0 correct -> (0 + 2) / (1 + 4) = 2/5 = 0.40
    assert AdaptiveEngine.calculate_smoothed_mastery(0, 1) == 0.40

    # 10 attempts, 9 correct -> (9 + 2) / (10 + 4) = 11/14 = 0.7857
    assert AdaptiveEngine.calculate_smoothed_mastery(9, 10) == 0.7857

    # 10 attempts, 1 correct -> (1 + 2) / (10 + 4) = 3/14 = 0.2143
    assert AdaptiveEngine.calculate_smoothed_mastery(1, 10) == 0.2143


def test_mastery_classification_sample_size_threshold():
    # Less than MIN_ATTEMPTS_FOR_EVIDENCE (3) must yield insufficient_evidence
    assert AdaptiveEngine.classify_mastery(0.40, attempt_count=1) == "insufficient_evidence"
    assert AdaptiveEngine.classify_mastery(0.80, attempt_count=2) == "insufficient_evidence"

    # Sufficient evidence tests:
    # < 0.50 -> weak
    assert AdaptiveEngine.classify_mastery(0.45, attempt_count=3) == "weak"
    # 0.50 to < 0.70 -> developing
    assert AdaptiveEngine.classify_mastery(0.55, attempt_count=4) == "developing"
    assert AdaptiveEngine.classify_mastery(0.69, attempt_count=5) == "developing"
    # 0.70 to < 0.85 -> progressing
    assert AdaptiveEngine.classify_mastery(0.72, attempt_count=6) == "progressing"
    assert AdaptiveEngine.classify_mastery(0.84, attempt_count=10) == "progressing"
    # >= 0.85 -> strong
    assert AdaptiveEngine.classify_mastery(0.86, attempt_count=8) == "strong"
    assert AdaptiveEngine.classify_mastery(0.95, attempt_count=15) == "strong"
