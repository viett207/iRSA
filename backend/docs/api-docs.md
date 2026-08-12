# iRSA API Documentation

**Last Updated:** 2025-12-27
**API Version:** v1
**Base URL:** `/api/v1`

---

## Authentication

All endpoints require JWT authentication via `Authorization` header:
```
Authorization: Bearer <token>
```

Admin role required for screening endpoints.

---

## Screening Endpoints

### 1. Get Job Analysis Results

**Endpoint:** `GET /screening/jobs/{job_id}/analysis`

**Description:** Retrieve paginated list of candidates with analysis scores for a specific job.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| job_id | integer | Yes | Job ID |
| page | integer | No | Page number (default: 1, min: 1) |
| size | integer | No | Results per page (default: 20, max: 100) |
| min_score | integer | No | Minimum overall score filter (0-100) |
| status | string | No | Filter by application status |

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "application_id": 5,
      "overall_score": 85,
      "skills_score": 90,
      "experience_score": 80,
      "education_score": 75,
      "culture_score": 85,
      "fit_summary": "Strong technical background with relevant experience...",
      "strengths": ["Python expertise", "5+ years experience", "Leadership"],
      "weaknesses": ["Limited DevOps experience"],
      "interview_questions": [
        {
          "category": "technical",
          "question": "Describe your experience with microservices...",
          "rationale": "Relevant to our architecture"
        }
      ],
      "red_flags": [],
      "analyzed_at": "2025-12-27T10:30:00Z",
      "candidate_name": "John Doe",
      "resume_filename": "john_doe_resume.pdf",
      "status": "reviewing"
    }
  ],
  "total": 45,
  "page": 1,
  "size": 20
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (non-admin)

---

### 2. Get Single Application Analysis

**Endpoint:** `GET /screening/applications/{application_id}/analysis`

**Description:** Retrieve detailed analysis for a specific application.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| application_id | integer | Yes | Application ID |

**Response (200 OK):**
```json
{
  "id": 1,
  "application_id": 5,
  "overall_score": 85,
  "skills_score": 90,
  "experience_score": 80,
  "education_score": 75,
  "culture_score": 85,
  "fit_summary": "Strong technical background with relevant experience...",
  "strengths": [
    "Advanced Python proficiency",
    "Proven leadership in teams",
    "5+ years relevant experience"
  ],
  "weaknesses": [
    "Limited cloud infrastructure experience",
    "No DevOps background"
  ],
  "interview_questions": [
    {
      "category": "technical",
      "question": "Tell us about your experience designing microservices",
      "rationale": "Relevant to our current architecture"
    },
    {
      "category": "behavioral",
      "question": "Describe a time you led a failed project to success",
      "rationale": "Tests resilience and leadership"
    },
    {
      "category": "situational",
      "question": "How would you handle a critical production outage?",
      "rationale": "Tests problem-solving under pressure"
    }
  ],
  "culture_signals": [
    "Values collaboration",
    "Proactive learner",
    "Team player"
  ],
  "red_flags": [],
  "llm_provider": "gemini",
  "analyzed_at": "2025-12-27T10:30:00Z",
  "candidate": {
    "id": 10,
    "full_name": "John Doe",
    "email": "john@example.com"
  },
  "resume": {
    "id": 8,
    "filename": "john_doe_resume.pdf",
    "parsed_data": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "skills": ["Python", "FastAPI", "PostgreSQL", "React"],
      "experience": [
        {
          "company": "Tech Corp",
          "title": "Senior Engineer",
          "duration": "2022-Present",
          "description": "Led team of 5 engineers..."
        }
      ],
      "education": [
        {
          "institution": "MIT",
          "degree": "BS",
          "field": "Computer Science",
          "year": "2018"
        }
      ],
      "languages": ["English", "Vietnamese"],
      "summary": "10+ years in software engineering..."
    }
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (non-admin)
- `404`: Application not found

---

### 3. Trigger Application Screening

**Endpoint:** `POST /screening/applications/{application_id}/process`

**Description:** Queue a single application for screening pipeline processing.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| application_id | integer | Yes | Application ID |

**Request Body:** `{}` (empty object)

**Response (200 OK):**
```json
{
  "message": "Screening started",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "application_id": 5
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid status (cannot process from current status)
- `401`: Unauthorized
- `403`: Forbidden (non-admin)
- `404`: Application not found

---

### 4. Trigger Bulk Screening

**Endpoint:** `POST /screening/jobs/{job_id}/process-all`

**Description:** Queue all unprocessed applications for a job.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| job_id | integer | Yes | Job ID |

**Request Body:** `{}` (empty object)

**Response (200 OK):**
```json
{
  "message": "Queued 12 applications for screening",
  "count": 12,
  "task_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Status Codes:**
- `200`: Success (even if count=0)
- `401`: Unauthorized
- `403`: Forbidden (non-admin)
- `404`: Job not found

---

### 5. Update Application Status

**Endpoint:** `PUT /screening/applications/{application_id}/status`

**Description:** Update application status in the hiring workflow.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| application_id | integer | Yes | Application ID |
| status | string | Yes | One of: submitted, reviewing, shortlisted, interviewing, offered, hired, rejected |

**Query String:** `?status=shortlisted`

**Request Body:** `{}` (empty object)

**Response (200 OK):**
```json
{
  "message": "Status updated to shortlisted",
  "application_id": 5,
  "status": "shortlisted",
  "public_status": "shortlisted"
}
```

**Status Mapping (Internal → Public):**
| Internal Status | Public Status |
|-----------------|---------------|
| submitted | in_review |
| reviewing | in_review |
| shortlisted | shortlisted |
| interviewing | shortlisted |
| offered | shortlisted |
| hired | selected |
| rejected | not_selected |

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (non-admin)
- `404`: Application not found
- `422`: Invalid status value

---

### 6. Get Job Screening Statistics

**Endpoint:** `GET /screening/jobs/{job_id}/stats`

**Description:** Retrieve screening statistics and metrics for a job.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| job_id | integer | Yes | Job ID |

**Response (200 OK):**
```json
{
  "job_id": 1,
  "application_counts": {
    "total": 45,
    "by_status": {
      "submitted": 5,
      "reviewing": 15,
      "shortlisted": 20,
      "interviewing": 3,
      "offered": 1,
      "hired": 0,
      "rejected": 1
    }
  },
  "score_distribution": {
    "excellent": 8,
    "good": 18,
    "average": 15,
    "poor": 4
  },
  "average_score": 68.5
}
```

**Score Tiers:**
- Excellent: 80-100
- Good: 60-79
- Average: 40-59
- Poor: 0-39

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (non-admin)
- `404`: Job not found

---

## Application Status Workflow

```
submitted → reviewing → shortlisted → interviewing → offered → hired
                     ↘                              ↗
                         → rejected
```

**Status Descriptions:**
- **submitted**: Initial application submitted
- **reviewing**: HR reviewing application
- **shortlisted**: Passed initial screening, moved to next round
- **interviewing**: Scheduled for or in interview process
- **offered**: Job offer extended
- **hired**: Candidate accepted and hired
- **rejected**: Application rejected

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `422`: Unprocessable Entity (validation error)
- `500`: Internal Server Error

---

## Rate Limiting

No explicit rate limiting on screening endpoints. Implement at API gateway level as needed.

---

## Pagination

Paginated endpoints use standard query parameters:
- `page`: Starting page (1-indexed)
- `size`: Results per page

Response includes:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "size": 20
}
```

---

## Data Types

### InterviewQuestion
```json
{
  "category": "technical|behavioral|situational",
  "question": "string",
  "rationale": "string (optional)"
}
```

### ApplicationStatus
- submitted
- reviewing
- shortlisted
- interviewing
- offered
- hired
- rejected

### ScreeningStage
- uploaded
- parsed
- rules_passed
- rules_failed
- analyzed

---

## Integration Notes

### Frontend Usage (Angular)

```typescript
// Get job candidates
this.screeningService.getJobAnalysis(jobId, {
  page: 1,
  size: 20,
  min_score: 60
}).subscribe(result => {
  this.candidates = result.items;
  this.total = result.total;
});

// Get single candidate details
this.screeningService.getApplicationAnalysis(appId).subscribe(analysis => {
  this.analysis = analysis;
  this.interviewQuestions = analysis.interview_questions;
});

// Update status
this.screeningService.updateApplicationStatus(appId, 'shortlisted').subscribe();

// Get stats for chart
this.screeningService.getJobStats(jobId).subscribe(stats => {
  this.scoreDistribution = stats.score_distribution;
});
```

---

## Performance Notes

- Query results are ordered by `overall_score DESC` for better candidates first
- Lazy loading of related entities (candidate, resume) to avoid N+1 queries
- Index on `(job_id, overall_score)` recommended for large datasets
