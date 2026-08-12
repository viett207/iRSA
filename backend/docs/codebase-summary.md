# iRSA Codebase Summary

**Last Updated:** 2025-12-27
**Current Phase:** Phase 5 - HR Screening Dashboard

## Project Overview

iRSA is a comprehensive Recruiting System Architecture with integrated resume screening, candidate evaluation, and HR dashboard management. The system supports multi-stage candidate assessment from application through hiring decisions.

**Architecture:** FastAPI backend + Angular admin/candidate frontends
**Status:** Phase 5 (HR Screening Dashboard) - In Progress
**Key Features:** Job Portal, Candidate Portal, Resume Parsing, Rule-based Screening, LLM Analysis, HR Admin Dashboard

---

## Phase Overview

### Phase 1: Foundation (COMPLETED)
- User authentication with JWT
- Role-based access control (Admin/Candidate)
- Database schema and models

### Phase 2: Job Portal (COMPLETED)
- Job listing and management
- Candidate application system
- Candidate profile management

### Phase 3: Candidate Portal (COMPLETED)
- Candidate dashboard
- Resume upload and management
- Application tracking

### Phase 4: Screening Pipeline (COMPLETED)
- Resume parsing (PDF, DOCX)
- Rule-based matching engine
- LLM analysis (Gemini/DeepSeek)
- Screening task queueing with Celery

### Phase 5: HR Screening Dashboard (IN PROGRESS)
- Admin dashboard for screening results
- Candidate list with analysis scores
- Candidate detail view with interview questions
- Application status workflow management
- Screening statistics and charts

---

## Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/              # Admin API endpoints
│   │   │   ├── auth.py      # Authentication endpoints
│   │   │   ├── jobs.py      # Job management
│   │   │   ├── screening.py # ← NEW: Screening dashboard endpoints
│   │   │   ├── users.py     # User management
│   │   │   └── router.py
│   │   └── public/          # Public API (candidates)
│   ├── core/
│   │   ├── database.py      # SQLAlchemy async setup
│   │   ├── security.py      # JWT token handling
│   │   └── exceptions.py
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── application.py
│   │   ├── resume.py
│   │   ├── analysis.py      # ← Analysis results model
│   │   └── audit.py
│   ├── services/
│   │   ├── llm/             # LLM integrations (Gemini, DeepSeek)
│   │   ├── parser/          # Resume parsing (PDF, DOCX, OCR)
│   │   ├── rules/           # Rule-based matching engine
│   │   └── job.py, application.py, resume.py
│   ├── tasks/
│   │   ├── celery_app.py    # Celery configuration
│   │   └── screening_tasks.py # Background task processing
│   ├── schemas/             # Pydantic models (request/response)
│   └── main.py              # FastAPI application
├── alembic/                 # Database migrations
│   └── versions/
│       ├── 001_initial_schema.py
│       ├── 002_jobs_schema.py
│       ├── 003_portal_schema.py
│       └── 004_screening_pipeline.py
├── tests/                   # Test suite
├── docs/
│   └── project-roadmap.md
└── requirements.txt
```

---

## Backend API Endpoints

### Admin Screening API (`/api/v1/screening`)

#### 1. Trigger Screening
- **POST** `/applications/{application_id}/process`
  - Queues a single application for screening
  - Returns: `{ message, task_id, application_id }`

#### 2. Bulk Screening
- **POST** `/jobs/{job_id}/process-all`
  - Queues all unprocessed applications for a job
  - Returns: `{ message, count, task_ids }`

#### 3. Get Job Analysis Results
- **GET** `/jobs/{job_id}/analysis`
  - Params: `page`, `size`, `min_score`, `status` (filter)
  - Returns paginated list of candidates with scores

#### 4. Get Application Analysis (NEW in Phase 5)
- **GET** `/applications/{application_id}/analysis`
  - Returns detailed analysis for a single candidate
  - Includes interview questions, strengths, weaknesses, red flags

#### 5. Update Application Status (NEW in Phase 5)
- **PUT** `/applications/{application_id}/status`
  - Params: `status` (submitted|reviewing|shortlisted|interviewing|offered|hired|rejected)
  - Maps internal status to public status for candidate view

#### 6. Get Job Statistics (NEW in Phase 5)
- **GET** `/jobs/{job_id}/stats`
  - Returns application counts by status
  - Score distribution (excellent/good/average/poor)
  - Average score for the job

---

## Frontend Structure

### Admin Dashboard (`frontend-admin/`)

#### Screening Feature (`src/app/features/screening/`)

**Models** (`screening.model.ts`):
- `ApplicationStatus`: submitted|reviewing|shortlisted|interviewing|offered|hired|rejected
- `AnalysisResult`: Candidate score breakdown (skills, experience, education, culture)
- `ScreeningStats`: Job-level statistics
- Status labels and color mappings in Vietnamese

**Service** (`screening.service.ts`):
- `getJobAnalysis()`: Fetch paginated results with filters
- `getApplicationAnalysis()`: Fetch single candidate details
- `getJobStats()`: Fetch job statistics
- `updateApplicationStatus()`: Update candidate workflow status
- `processApplication()`: Trigger screening for one app
- `processAllApplications()`: Trigger bulk screening

**Components**:
1. **candidate-list**: Grid view of all candidates for a job
   - Sortable by score
   - Filterable by status and score
   - Paginated display
   - Quick action buttons

2. **candidate-detail**: Detailed candidate view
   - Full analysis breakdown
   - Interview questions categorized by type
   - Skills/experience/education scores
   - Strengths, weaknesses, red flags
   - Status workflow management

3. **score-chart**: Chart component for score visualization
   - Displays score distribution for job
   - Excellent/good/average/poor tiers

4. **interview-questions**: Display interview questions
   - Technical, behavioral, situational
   - Organized by category

**Routing** (`screening.routes.ts`):
```typescript
/screening
  /jobs/:jobId/candidates         → candidate-list
  /applications/:appId            → candidate-detail
```

**Integration** (`app.routes.ts`):
- Screening routes integrated into main application routes
- Job detail page links to candidate screening dashboard

---

## Database Schema

### Key Tables (Phase 5 Relevant)

**applications**
- `id`, `candidate_id`, `job_id`
- `status`: submitted|reviewing|shortlisted|interviewing|offered|hired|rejected
- `public_status`: in_review|shortlisted|selected|not_selected (candidate-facing)
- Timestamps and audit fields

**analysis_results**
- `id`, `application_id`, `job_id`
- Scoring: `overall_score`, `skills_score`, `experience_score`, `education_score`, `culture_score`
- Analysis: `fit_summary`, `strengths[]`, `weaknesses[]`, `interview_questions[]`
- `red_flags[]`, `culture_signals[]`
- `llm_provider`, `analyzed_at`

**resumes**
- `id`, `candidate_id`, `job_id`
- File metadata: `original_filename`, `minio_path`, `file_size`
- Processing: `stage`, `parsed_content{}`, `rules_result{}`

**job_criteria**
- `must_have_skills[]`, `nice_to_have_skills[]`
- `min_experience_years`, `max_experience_years`
- Scoring weights for LLM analysis

---

## Technology Stack

### Backend
- **Framework**: FastAPI (async Python)
- **ORM**: SQLAlchemy 2.0 (async)
- **Task Queue**: Celery
- **Database**: PostgreSQL (with JSONB support)
- **LLM Providers**: Google Gemini, DeepSeek
- **Resume Parsing**: PDF (pdfplumber), DOCX (python-docx), OCR (Tesseract)
- **Text Processing**: Spacy, NLTK

### Frontend
- **Framework**: Angular 18+
- **Language**: TypeScript
- **UI Components**: Ng-Zorro (Ant Design for Angular)
- **HTTP Client**: HttpClient with RxJS Observables
- **Routing**: Angular Router

### Infrastructure
- **API Documentation**: OpenAPI/Swagger
- **Storage**: MinIO (resume files)
- **Authentication**: JWT (admin), Session (candidate portal)

---

## Key Features in Phase 5

### HR Screening Dashboard
1. **Candidate List View**
   - Displays all candidates for a job with overall scores
   - Sortable columns, filterable by status and min_score
   - Pagination with configurable page size

2. **Candidate Detail View**
   - Complete analysis breakdown
   - Score components (40% skills, 30% experience, 20% education, 10% culture)
   - AI-generated interview questions (technical, behavioral, situational)
   - Identified strengths and weaknesses
   - Red flags and culture signals
   - Status workflow for HR actions

3. **Screening Statistics**
   - Application count breakdown by status
   - Score distribution chart
   - Average score metrics

4. **Application Status Workflow**
   - Statuses: submitted → reviewing → shortlisted → interviewing → offered → hired/rejected
   - Status updates trigger public status mapping for candidates

---

## Background Tasks

**Celery Tasks** (`app/tasks/screening_tasks.py`):
1. **parse_resume**: Extract text and structure from uploaded files
2. **apply_rules_engine**: Match resume against job criteria
3. **analyze_with_llm**: Generate scores and recommendations
4. **process_application**: Orchestrates full screening pipeline

---

## Security & Access Control

- **Authentication**: JWT tokens for admin users
- **Authorization**: Role-based access control (Admin only for screening endpoints)
- **Data Protection**: Password hashing, secure token handling
- **Input Validation**: Pydantic schemas, regex patterns for status values

---

## Testing Coverage

**Test Files**:
- `test_llm_base.py`: LLM provider implementations
- `test_rules_engine.py`: Rule-based matching logic
- `test_parser_*.py`: Resume parsing for different formats
- `test_vn_processor.py`: Vietnamese text processing

---

## Recent Changes (Phase 5)

### Backend
- ✓ Added PUT endpoint for application status updates
- ✓ Added GET endpoint for detailed application analysis
- ✓ Added job statistics endpoint

### Frontend
- ✓ New screening feature module structure
- ✓ Candidate list component with sorting/filtering
- ✓ Candidate detail component with full analysis
- ✓ Score chart visualization
- ✓ Interview questions display component
- ✓ Integrated screening routes into main app

---

## Deployment & Configuration

**Environment Variables**:
- Database URL: `DATABASE_URL`
- JWT secret: `JWT_SECRET_KEY`
- LLM APIs: `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`
- MinIO credentials: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, etc.
- Celery broker: `CELERY_BROKER_URL`

**Database Migrations**:
```bash
alembic upgrade head
```

---

## Next Steps (Phase 6)

- Interview scheduling integration
- Offer letter generation
- Final hiring decision workflow
- Reporting and analytics
- Candidate rejection communication
- Integration with external HR systems
