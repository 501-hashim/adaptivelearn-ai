import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine, Base, get_db
from app.routers import auth, curriculum, quizzes, students

logger = logging.getLogger("uvicorn.info")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created for local development
    Base.metadata.create_all(bind=engine)
    logger.info("AdaptiveLearn AI backend started and database verified.")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Quiz Generator Based on Student Performance and Learning Gaps",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
origins = list(settings.CORS_ALLOWED_ORIGINS)
if settings.FRONTEND_ORIGIN not in origins:
    origins.append(settings.FRONTEND_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Operational endpoints
@app.get("/health", tags=["Operational"])
def health_check():
    """Liveness probe: verifies the process is running."""
    return {"status": "healthy", "service": "AdaptiveLearn AI Backend"}


@app.get("/ready", tags=["Operational"])
def readiness_check(db: Session = Depends(get_db)):
    """Readiness probe: verifies database connectivity without leaking sensitive info."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected"}


# Register API v1 Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(curriculum.router, prefix=settings.API_V1_STR)
app.include_router(quizzes.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
