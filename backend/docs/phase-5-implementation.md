# Phase 5: HR Screening Dashboard - Implementation Guide

**Date:** 2025-12-27
**Phase Status:** IN PROGRESS (85% complete)
**Target Completion:** 2025-12-28

---

## Overview

Phase 5 implements the HR admin dashboard for reviewing screening results and managing candidate workflows. This includes a complete candidate list with filtering/sorting, detailed candidate views with AI-generated insights, and application status management.

---

## Backend Implementation

### New Endpoints Added

**File:** `/app/api/v1/screening.py`

#### 1. GET /screening/jobs/{job_id}/analysis
- **Purpose:** Get paginated list of candidates with analysis scores
- **Parameters:** `page`, `size`, `min_score`, `status` (filter)
- **Returns:** Paginated results sorted by overall_score DESC
- **Key Query Optimization:** Uses `selectinload()` to prevent N+1 queries

#### 2. GET /screening/applications/{application_id}/analysis
- **Purpose:** Get detailed analysis for single application
- **Returns:** Complete analysis with candidate info and resume parsed data
- **Use Case:** Detail page view

#### 3. PUT /screening/applications/{application_id}/status
- **Purpose:** Update application status in hiring workflow
- **Parameters:** `status` (query param, regex validated)
- **Valid Statuses:** submitted, reviewing, shortlisted, interviewing, offered, hired, rejected
- **Status Mapping:** Maps internal status to public status for candidate visibility

#### 4. GET /screening/jobs/{job_id}/stats
- **Purpose:** Get screening metrics for a job
- **Returns:**
  - Application counts by status
  - Score distribution (excellent/good/average/poor)
  - Average score

#### 5. POST /screening/applications/{application_id}/process
- **Purpose:** Trigger screening for single application
- **Returns:** `{ message, task_id, application_id }`

#### 6. POST /screening/jobs/{job_id}/process-all
- **Purpose:** Bulk trigger screening for all unprocessed applications
- **Returns:** `{ message, count, task_ids }`

### Database Queries

**Optimizations Applied:**
```python
# Prevent N+1 queries
.options(
    selectinload(AnalysisResult.application).selectinload(Application.candidate),
    selectinload(AnalysisResult.resume),
)

# Efficient pagination
stmt.offset((page - 1) * size).limit(size)

# Score aggregation
func.count().filter(AnalysisResult.overall_score >= 80)
```

**Recommended Indexes:**
```sql
CREATE INDEX idx_analysis_job_score ON analysis_results(job_id, overall_score DESC);
CREATE INDEX idx_application_job_status ON applications(job_id, status);
```

---

## Frontend Implementation

### Feature Structure

**Location:** `frontend-admin/src/app/features/screening/`

```
screening/
├── models/
│   └── screening.model.ts         # TypeScript interfaces
├── services/
│   └── screening.service.ts       # HTTP service
├── pages/
│   ├── candidate-list/
│   │   ├── candidate-list.component.ts
│   │   ├── candidate-list.component.html
│   │   └── candidate-list.component.scss
│   └── candidate-detail/
│       ├── candidate-detail.component.ts
│       ├── candidate-detail.component.html
│       └── candidate-detail.component.scss
├── components/
│   ├── score-chart/
│   │   ├── score-chart.component.ts
│   │   ├── score-chart.component.html
│   │   └── score-chart.component.scss
│   └── interview-questions/
│       ├── interview-questions.component.ts
│       ├── interview-questions.component.html
│       └── interview-questions.component.scss
└── screening.routes.ts
```

### Models (`screening.model.ts`)

**Key Interfaces:**
- `ApplicationStatus`: Type union for 7 workflow statuses
- `AnalysisResult`: Candidate scoring and analysis data
- `ScreeningStats`: Job-level metrics
- `InterviewQuestion`: Categorized (technical, behavioral, situational)
- `ParsedResumeData`: Extracted resume information

**Helper Functions:**
```typescript
getScoreTier(score: number): 'excellent' | 'good' | 'average' | 'poor'
getScoreColor(score: number): string
```

**Vietnamese Labels:**
```typescript
APPLICATION_STATUS_LABELS // Status names in Vietnamese
APPLICATION_STATUS_COLORS  // Ng-Zorro color tags
SCORE_TIER_LABELS         // Score tier descriptions
SCORE_TIER_COLORS         // Score visualization colors
```

### Service (`screening.service.ts`)

**Main Methods:**
```typescript
getJobAnalysis(jobId, params): Observable<AnalysisListResponse>
getApplicationAnalysis(applicationId): Observable<AnalysisResult>
getJobStats(jobId): Observable<ScreeningStats>
updateApplicationStatus(appId, status): Observable<any>
processApplication(appId): Observable<ProcessResponse>
processAllApplications(jobId): Observable<BulkProcessResponse>
```

### Components

#### CandidateListComponent
- **Purpose:** Display all candidates for a job
- **Features:**
  - Pagination (page, size)
  - Sorting by score (DESC default)
  - Filtering by status and min_score
  - Row click to navigate to detail
- **Data Binding:** Ng-Zorro Table component
- **Search/Filter:** Frontend filtering or API params

#### CandidateDetailComponent
- **Purpose:** Full candidate analysis view
- **Sections:**
  1. Basic Info (name, email, status)
  2. Score Breakdown (4 components with percentages)
  3. Overall Assessment (fit summary)
  4. Interview Questions (by category)
  5. Strengths/Weaknesses/Red Flags
  6. Status Change Actions
- **Actions:** Update status button with dropdown/modal

#### ScoreChartComponent
- **Purpose:** Visualize score distribution
- **Chart Type:** Bar chart or pie chart
- **Data:** excellent/good/average/poor counts
- **Library:** Ng-Zorro charts or chart.js

#### InterviewQuestionsComponent
- **Purpose:** Display AI-generated interview questions
- **Organization:** By category (technical, behavioral, situational)
- **Display:** Card layout with question + rationale

### Routing

**screening.routes.ts:**
```typescript
const routes: Routes = [
  {
    path: 'jobs/:jobId/candidates',
    component: CandidateListComponent,
  },
  {
    path: 'applications/:appId',
    component: CandidateDetailComponent,
  },
];
```

**Integrated in app.routes.ts:**
```typescript
{
  path: 'screening',
  children: screeningRoutes,
}
```

---

## Data Flow

### Candidate List View

```
1. CandidateListComponent loads
   ↓
2. screeningService.getJobAnalysis(jobId, params)
   ↓
3. GET /api/v1/screening/jobs/:jobId/analysis
   ↓
4. Backend queries analysis_results with filters
   ↓
5. Returns AnalysisListResponse { items[], total, page, size }
   ↓
6. Component displays in table with pagination/sorting
```

### Candidate Detail View

```
1. CandidateDetailComponent loads with :appId
   ↓
2. screeningService.getApplicationAnalysis(appId)
   ↓
3. GET /api/v1/screening/applications/:appId/analysis
   ↓
4. Backend loads analysis with candidate + resume data
   ↓
5. Returns AnalysisResult with full details
   ↓
6. Component displays analysis breakdown and interview questions
```

### Status Update

```
1. User clicks status change button
   ↓
2. Modal/dropdown shows available statuses
   ↓
3. screeningService.updateApplicationStatus(appId, newStatus)
   ↓
4. PUT /api/v1/screening/applications/:appId/status?status=newStatus
   ↓
5. Backend updates status + maps to public_status
   ↓
6. Returns success response
   ↓
7. Component updates UI and navigates/refreshes
```

---

## Status Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION STATUS WORKFLOW                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  submitted ──→ reviewing ──→ shortlisted ──→ interviewing   │
│                                    ↓                         │
│                              offered ──→ hired              │
│                                    ↓                         │
│                               rejected                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Status Descriptions:**
- **submitted**: Initial application received
- **reviewing**: HR actively reviewing
- **shortlisted**: Passed screening, advanced to next round
- **interviewing**: Interview scheduled or in progress
- **offered**: Offer extended to candidate
- **hired**: Candidate accepted offer
- **rejected**: Application rejected

**Public Status Mapping:**
| Internal | Public |
|----------|--------|
| submitted, reviewing | in_review |
| shortlisted, interviewing, offered | shortlisted |
| hired | selected |
| rejected | not_selected |

---

## Scoring System

### Score Components (Weighted)

| Component | Weight | Range | Purpose |
|-----------|--------|-------|---------|
| Skills | 40% | 0-100 | Skill match vs requirements |
| Experience | 30% | 0-100 | Years and relevance |
| Education | 20% | 0-100 | Degree and field match |
| Culture | 10% | 0-100 | Values alignment |

### Overall Score

```
Overall = (Skills × 0.40) + (Experience × 0.30) + (Education × 0.20) + (Culture × 0.10)
```

### Score Tiers

- **Excellent** (80-100): Strong match, recommended for interview
- **Good** (60-79): Solid fit, consider for interview
- **Average** (40-59): Borderline, may need further review
- **Poor** (0-39): Weak match, likely reject

---

## Error Handling

### API Error Responses

```typescript
// Status update with invalid status
422 Unprocessable Entity

// Non-existent application
404 Not Found
{ "detail": "Application not found" }

// Unauthorized access
401 Unauthorized
{ "detail": "Not authenticated" }

// Non-admin user
403 Forbidden
{ "detail": "Not authorized" }
```

### Frontend Error Handling

```typescript
// Show error toast/snackbar
this.screeningService.updateApplicationStatus(appId, status)
  .subscribe({
    next: (response) => {
      // Show success message
      this.message.success('Status updated');
      this.loadCandidates();
    },
    error: (error) => {
      // Show error message
      this.message.error(error.error.detail || 'Failed to update status');
    }
  });
```

---

## Performance Considerations

### Query Optimization
- **N+1 Prevention:** Use `selectinload()` for relationships
- **Pagination:** Always paginate large result sets
- **Indexes:** Add index on `(job_id, overall_score DESC)`

### Frontend Optimization
- **Lazy Loading:** Load candidate detail only when needed
- **Change Detection:** Use OnPush strategy where possible
- **Virtual Scrolling:** For large candidate lists (>500)

### Caching
- **No Caching:** Results can change frequently due to screening
- **Manual Refresh:** Allow user to refresh data

---

## Testing Strategy

### Backend Unit Tests
- Test each endpoint with valid/invalid parameters
- Test status validation regex
- Test pagination and filtering
- Test error cases (404, invalid status, etc.)

### Frontend Unit Tests
- Component initialization and data binding
- User interactions (click, status change)
- Service method calls and responses
- Observable subscription handling

### Integration Tests
- Full flow: Load candidates → View detail → Update status
- Navigation between list and detail views
- Error scenarios and recovery

---

## Deployment Checklist

- [ ] Backend API endpoints tested and documented
- [ ] Frontend components built and tested
- [ ] Routes integrated into main app
- [ ] Database indexes created
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Vietnamese labels verified
- [ ] API documentation updated
- [ ] Code review completed
- [ ] Test coverage verified

---

## Next Steps (Phase 6)

1. **Interview Scheduling**
   - Add scheduling interface
   - Integrate calendar system
   - Send interview invitations

2. **Offer Management**
   - Generate offer letters
   - Track offer status
   - Send offer documents

3. **Reporting & Analytics**
   - Candidate pipeline charts
   - Time-to-hire metrics
   - Success rate tracking

4. **Communication**
   - Automated rejection emails
   - Interview confirmations
   - Offer acceptance tracking

---

## Technical Debt

- [ ] Add pagination on large screening statistics
- [ ] Implement virtual scrolling for >500 candidates
- [ ] Add caching strategy for frequently accessed data
- [ ] Optimize database queries for >10k candidates
- [ ] Add request/response validation logging

---

## References

- API Documentation: `/docs/api-docs.md`
- Codebase Summary: `/docs/codebase-summary.md`
- Project Roadmap: `/docs/project-roadmap.md`
