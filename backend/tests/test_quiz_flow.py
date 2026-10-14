import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db
from app.core.security import get_password_hash
from app.models.models import Student, Subject, Chapter, Concept, Question
from app.db.seed import seed_data

client = TestClient(app)


def test_health_and_ready():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_ready = client.get("/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready"


def test_registration_and_login():
    import uuid
    unique_email = f"student_{uuid.uuid4().hex[:8]}@adaptivelearn.ai"
    reg_payload = {
        "display_name": "Test Student",
        "email": unique_email,
        "password": "Password123!",
        "confirm_password": "Password123!",
        "grade": 8
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["student"]["email"] == unique_email

    # 2. Login
    login_payload = {
        "email": unique_email,
        "password": "Password123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    assert token is not None

    # 3. Test /auth/me
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == unique_email


def test_adaptive_quiz_lifecycle():
    # Login as demo student
    login_res = client.post("/api/v1/auth/login", json={
        "email": "student@adaptivelearn.ai",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch subjects
    subj_res = client.get("/api/v1/subjects", headers=headers)
    assert subj_res.status_code == 200
    subjects = subj_res.json()
    assert len(subjects) >= 1
    target_subject = subjects[0]

    # 2. Start a diagnostic quiz with 5 questions
    quiz_payload = {
        "subject_id": target_subject["id"],
        "mode": "diagnostic",
        "question_count": 5,
        "difficulty_preference": "adaptive"
    }
    q_create_res = client.post("/api/v1/quizzes", json=quiz_payload, headers=headers)
    assert q_create_res.status_code == 201
    quiz_data = q_create_res.json()
    assert quiz_data["actual_question_count"] == 5
    assert len(quiz_data["questions"]) == 5
    # Verify answers are NOT revealed
    for q in quiz_data["questions"]:
        assert "correct_option" not in q
        assert "explanation" not in q
        assert len(q["options"]) == 4

    quiz_id = quiz_data["id"]

    # 3. Save an in-progress response
    first_q = quiz_data["questions"][0]
    save_res = client.put(f"/api/v1/quizzes/{quiz_id}/responses", json={
        "question_id": first_q["id"],
        "selected_option": "A",
        "marked_for_review": True
    }, headers=headers)
    assert save_res.status_code == 200

    # 4. Submit quiz
    submit_payload = {
        "responses": [
            {"question_id": q["id"], "selected_option": "A"}
            for q in quiz_data["questions"]
        ],
        "total_time_seconds": 45
    }
    submit_res = client.post(f"/api/v1/quizzes/{quiz_id}/submit", json=submit_payload, headers=headers)
    assert submit_res.status_code == 200
    result_data = submit_res.json()
    assert result_data["total_questions"] == 5
    assert "score" in result_data
    assert len(result_data["questions"]) == 5
    # Results now contain explanation and correct answers
    assert "correct_option" in result_data["questions"][0]
    assert "explanation" in result_data["questions"][0]

    # 5. Fetch results via GET /quizzes/{quiz_id}/results
    results_res = client.get(f"/api/v1/quizzes/{quiz_id}/results", headers=headers)
    assert results_res.status_code == 200
    fetched_results = results_res.json()
    assert fetched_results["quiz_id"] == quiz_id
    assert fetched_results["total_questions"] == 5
    assert len(fetched_results["questions"]) == 5

    # 6. Fetch history via GET /quizzes/history (verifies no route collision with /{quiz_id})
    history_res = client.get("/api/v1/quizzes/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert isinstance(history, list)
    assert len(history) >= 1
    assert any(item["id"] == quiz_id for item in history)

    # 7. Dashboard reflects completion
    dash_res = client.get("/api/v1/students/me/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dashboard = dash_res.json()
    assert dashboard["total_quizzes_completed"] >= 1
