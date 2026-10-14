# AdaptiveLearn AI — AI Quiz Generator Based on Student Performance & Learning Gaps

AdaptiveLearn AI is a full-stack, production-minded adaptive educational web application designed for school students. Rather than delivering static or random question sets, the platform continuously tracks individual concept mastery, diagnoses learning gaps in real time, and dynamically structures subsequent quizzes to target weak areas and foundational prerequisites.

---

## Architecture & Core Adaptive Algorithm

```
  [ Student Takes Quiz ]
            │
            ▼
  [ Backend Validates & Scores ] (Client never calculates scores)
            │
            ▼
  [ Laplace-Smoothed Mastery Estimation ]
    Smoothed Accuracy = (correct + 2) / (attempts + 4)
            │
            ▼
  [ Learning Gap Detection & Prerequisite Graph Analysis ]
    - Weak (< 0.50 with >= 3 attempts)
    - Developing (0.50 - 0.69)
    - Progressing (0.70 - 0.84)
    - Strong (>= 0.85)
            │
            ▼
  [ Dynamic Next Quiz Composition ]
    - 60% Weak concepts & foundational prerequisites
    - 20% Developing concepts
    - 20% Retention / Unknown breadth
    - Difficulty auto-calibrated to student mastery level
```

---

## Features

1. **Secure Authentication & Role Isolation**: Argon2 password hashing with signed, expiring JWT access tokens.
2. **Grade-Appropriate Curriculum**: Full Grade 8 Mathematics (Rational Numbers, Linear Equations, Understanding Quadrilaterals) and Science (Cell Structure, Force & Pressure, Light & Reflection) with prerequisite graphs.
3. **Verified Question Bank**: 100+ vetted, age-appropriate multiple-choice questions with distinct 4-option sets, verified answer keys, and pedagogical explanations.
4. **Transparent Adaptive Engine**: Implements Laplace smoothing, empirical sample-size thresholds (`MIN_ATTEMPTS_FOR_EVIDENCE = 3`), and deterministic concept quota distribution.
5. **Real-Time Auto-Saving**: Persists question answers and review flags seamlessly during active quiz sessions; safe against accidental browser refresh.
6. **Student Dashboard & Analytics**: Live progress breakdown, gap alerts, personalized recommendations, and recent quiz history.
7. **Optional Gemini AI Question Generator**: Clean provider abstraction allowing candidate question generation via Google Gemini API when configured, with zero dependency for core operations.
8. **Student Privacy & Data Protection**: Minimal collection of personal data, no third-party tracking, strict object-level authorization across all endpoints.

---

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide-style SVG icons.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic migrations, Uvicorn, Passlib (Argon2), python-jose (JWT).
- **Database**: SQLite for zero-config local development; PostgreSQL for production deployment.
- **DevOps**: Dockerfile for backend and frontend, Docker Compose, Render Blueprint (`render.yaml`), Vercel SPA config (`vercel.json`).

---

## Repository Structure

```
adaptivelearn-ai/
├── backend/
│   ├── app/
│   │   ├── core/           # Security, config, settings
│   │   ├── db/             # SQLAlchemy session, engine, seed loader
│   │   ├── models/         # ORM database models & relationships
│   │   ├── schemas/        # Pydantic v2 request/response schemas
│   │   ├── routers/        # Versioned endpoints (auth, curriculum, quizzes, students)
│   │   ├── services/       # Adaptive learning engine & AI provider
│   │   └── main.py         # FastAPI application entrypoint
│   ├── migrations/         # Alembic database migrations
│   ├── tests/              # Unit & integration tests
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container specification
├── frontend/
│   ├── src/
│   │   ├── components/     # Icons, ProtectedRoute, UI components
│   │   ├── contexts/       # AuthContext & session handling
│   │   ├── layouts/        # MainLayout with header and footer
│   │   ├── pages/          # Landing, Register, Login, Dashboard, Quiz, Results, Progress
│   │   ├── services/       # Central API client
│   │   ├── types/          # TypeScript interface definitions
│   │   ├── App.tsx         # Routing configuration
│   │   └── main.tsx        # React entrypoint
│   ├── package.json
│   ├── vite.config.ts
│   ├── vercel.json
│   └── Dockerfile
├── data/
│   ├── curriculum_seed.json   # Grade 8 curriculum outline & prerequisite tree
│   └── verified_questions.json# 101 verified educational MCQs
├── docker-compose.yml
├── render.yaml
├── .env.example
├── .gitignore
└── README.md
```

---

## Local Development Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv env
# Windows:
.\env\Scripts\activate
# Linux/macOS:
# source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed verified curriculum & question bank
python app/db/seed.py --reset

# Run backend test suite
python -m pytest -v

# Start development server
uvicorn app.main:app --reload --port 8000
```
Backend API will be live at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Start frontend development server
npm run dev
```
Frontend web application will run at `http://localhost:5173`.

---

## Seed Data & Demo Student Credentials

The database comes pre-seeded with a demonstration student account:
- **Email**: `student@adaptivelearn.ai`
- **Password**: `Password123!`
- **Grade**: 8

You can also register any new student directly via the `/register` page.

---

## Production Deployment

### Backend on Microsoft Azure (Azure App Service + Azure Database for PostgreSQL)
1. **Azure Database for PostgreSQL**:
   - Create a flexible server in the Azure Portal or via Azure CLI:
     ```bash
     az postgres flexible-server create --resource-group <rg> --name <server-name> --database-name adaptivelearn --admin-user <admin> --admin-password <password>
     ```
   - Connection URL: `postgresql://<admin>:<password>@<server-name>.postgres.database.azure.com:5432/adaptivelearn?sslmode=require`
2. **Azure App Service (Linux Python 3.12)**:
   - Create a Web App targeting Python 3.12 on Linux.
   - Set Startup Command under **Configuration > General Settings**:
     ```bash
     bash startup.sh
     ```
   - Configure Application Settings (Environment Variables):
     - `DATABASE_URL`: Your Azure PostgreSQL connection string (with SSL).
     - `SECRET_KEY`: A high-entropy secret string for JWT signing.
     - `FRONTEND_ORIGIN`: Your deployed Vercel URL (e.g., `https://adaptivelearn.vercel.app`).
     - `CORS_ALLOWED_ORIGINS`: `https://adaptivelearn.vercel.app`
     - `AI_PROVIDER`: `gemini`
     - `GEMINI_API_KEY`: Your Google Gemini API key.
     - `GEMINI_MODEL`: `gemini-1.5-flash`

### Frontend on Vercel
1. Import the repository into Vercel and set the **Root Directory** to `frontend`.
2. Configure Environment Variable:
   - `VITE_API_BASE_URL`: Your Azure backend URL (e.g., `https://adaptivelearn-backend.azurewebsites.net`).
3. Deploy. The repository contains `frontend/vercel.json`, which configures single-page application (SPA) rewrites to prevent 404 errors on deep routes such as `/quiz/:quizId/results`.

---

## Generative AI Upgrade (Google Gemini)

AdaptiveLearn AI integrates **Google Gemini 1.5 Flash** for personalized question generation targeting individual student learning gaps:
- **Gap Diagnosis**: The adaptive engine analyzes low mastery scores and prerequisite graphs to pinpoint exact conceptual weaknesses.
- **Pedagogical Prompt Formulation**: Automatically sends structured prompts specifying target concept, learning objective, difficulty level, and student misconception context.
- **Strict Multi-Stage Validation Pipeline**:
  1. JSON parsing and structure validation.
  2. Exactly 4 distinct options with keys `A`, `B`, `C`, `D`.
  3. Correct option key validation.
  4. Duplicate option text and duplicate question detection against the existing concept question bank.
  5. Pedagogical explanation quality check.
- **Seamless Offline Fallback**: If `GEMINI_API_KEY` is not present, or API limits are reached, the system gracefully falls back to the curated 100+ verified question bank with zero disruption to the student. Deterministic scoring and Laplace-smoothed mastery calculations remain strictly server-side.

---

## Security & Student Privacy Notice

- **Password Storage**: Passwords hashed using Argon2 with salt.
- **Client Scoring**: Browser never receives answer keys or calculates scores; all answers evaluated server-side.
- **Resource Ownership**: Object-level authorization ensures students cannot read or tamper with another student's attempts or mastery data.
- **Data Minimization**: Stores only necessary progress indicators; suitable for educational compliance assessments before minor student onboarding.
