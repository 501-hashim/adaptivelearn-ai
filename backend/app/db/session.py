from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Format PostgreSQL database URLs if provided in postgres:// format (common on Render / Heroku / Azure)
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# Ensure proper dialect driver is matched for SQLAlchemy 2.x
if database_url.startswith("postgresql://"):
    try:
        import psycopg
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    except ImportError:
        try:
            import psycopg2
            database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        except ImportError:
            pass

connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
}

if "sqlite" in database_url:
    connect_args["check_same_thread"] = False
else:
    # Production PostgreSQL (e.g. Azure Database for PostgreSQL)
    if "sslmode" not in database_url and "localhost" not in database_url and "127.0.0.1" not in database_url:
        connect_args["sslmode"] = "require"
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 1800,
    })

engine = create_engine(
    database_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
