from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.models import Student
from app.schemas.schemas import StudentRegister, StudentLogin, Token, StudentOut
from app.routers.deps import get_current_student

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(student_in: StudentRegister, db: Session = Depends(get_db)):
    if student_in.password != student_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    # Check for duplicate email (case-insensitive)
    normalized_email = student_in.email.strip().lower()
    existing_student = db.query(Student).filter(Student.email == normalized_email).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    new_student = Student(
        display_name=student_in.display_name.strip(),
        email=normalized_email,
        password_hash=get_password_hash(student_in.password),
        grade=student_in.grade,
        is_active=True
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    access_token = create_access_token(
        subject=new_student.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        student=StudentOut.model_validate(new_student)
    )


@router.post("/login", response_model=Token)
def login(login_in: StudentLogin, db: Session = Depends(get_db)):
    normalized_email = login_in.email.strip().lower()
    student = db.query(Student).filter(Student.email == normalized_email).first()

    if not student or not verify_password(login_in.password, student.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not student.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    access_token = create_access_token(
        subject=student.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        student=StudentOut.model_validate(student)
    )


@router.get("/me", response_model=StudentOut)
def get_me(current_student: Student = Depends(get_current_student)):
    return StudentOut.model_validate(current_student)


@router.post("/logout")
def logout():
    """Client simply drops token, stateless logout."""
    return {"message": "Successfully logged out"}
