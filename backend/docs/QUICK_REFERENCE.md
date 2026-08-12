# Quick Reference Guide - Phase 5

**Last Updated:** 2025-12-27
**Phase:** Phase 5 - HR Screening Dashboard
**Status:** IN PROGRESS (85% complete)

---

## Documentation Map

### 📄 Main Documents

| Document | Purpose | Key Content |
|----------|---------|-------------|
| **codebase-summary.md** | Architecture overview | Directory structure, tech stack, all phases |
| **api-docs.md** | API reference | 6 endpoints, parameters, responses |
| **phase-5-implementation.md** | Implementation guide | Backend/frontend details, data flows |
| **project-roadmap.md** | Project status | Phases 1-7, milestones, changelog |
| **QUICK_REFERENCE.md** | This file | Quick lookup for common tasks |

---

## Screening API Endpoints

### Quick Lookup Table

| Method | Endpoint | Purpose | Key Params |
|--------|----------|---------|-----------|
| GET | `/screening/jobs/{id}/analysis` | List candidates | page, size, min_score, status |
| GET | `/screening/applications/{id}/analysis` | Candidate detail | — |
| POST | `/screening/applications/{id}/process` | Trigger screening | — |
| POST | `/screening/jobs/{id}/process-all` | Bulk screening | — |
| PUT | `/screening/applications/{id}/status` | Update status | status (required) |
| GET | `/screening/jobs/{id}/stats` | Job statistics | — |

### Example API Calls

**Get candidates list:**
```bash
GET /api/v1/screening/jobs/1/analysis?page=1&size=20&min_score=60
```

**Get candidate details:**
```bash
GET /api/v1/screening/applications/5/analysis
```

**Update application status:**
```bash
PUT /api/v1/screening/applications/5/status?status=shortlisted
```

**Get job statistics:**
```bash
GET /api/v1/screening/jobs/1/stats
```

---

## Frontend Components

### Component Tree

```
screening/
├── pages/
│   ├── candidate-list/
│   │   └── Shows all candidates (list page)
│   └── candidate-detail/
│       └── Shows full analysis (detail page)
├── components/
│   ├── score-chart/
│   │   └── Visualizes score distribution
│   └── interview-questions/
│       └── Displays interview questions by category
└── services/
    └── screening.service.ts (HTTP calls)
```

### Navigation

```
/screening/jobs/1/candidates     → Candidate list for job 1
/screening/applications/5        → Details for application 5
```

---

## Status Workflow

### Visual Flow

```
submitted (新) → reviewing (审查中) → shortlisted (入选)
                                        ↓
                            interviewing (面试中)
                                        ↓
                            offered (已报价) → hired (已聘用)
                                        ↓
                            rejected (已拒绝)
```

### Status to Public Mapping

```
Internal Status         → Public Status (for candidate view)
submitted, reviewing    → in_review (审核中)
shortlisted,
interviewing, offered   → shortlisted (入选)
hired                   → selected (已选中)
rejected                → not_selected (未选中)
```

---

## Data Models Quick Reference

### AnalysisResult (Main Model)

```typescript
{
  id: number,
  application_id: number,
  overall_score: 0-100,              // Weighted average
  skills_score: 0-100,               // 40% weight
  experience_score: 0-100,           // 30% weight
  education_score: 0-100,            // 20% weight
  culture_score: 0-100,              // 10% weight
  fit_summary: string,               // AI summary
  strengths: string[],               // Top 3-5
  weaknesses: string[],              // Top 3-5
  interview_questions: [
    {
      category: 'technical|behavioral|situational',
      question: string,
      rationale?: string
    }
  ],
  red_flags: string[],               // Concerns
  culture_signals: string[],         // Cultural fit indicators
  analyzed_at: datetime,             // When analyzed
  candidate: {                        // Linked data
    id: number,
    full_name: string,
    email: string
  }
}
```

### ScreeningStats (Metrics)

```typescript
{
  job_id: number,
  application_counts: {
    total: number,
    by_status: {
      submitted: number,
      reviewing: number,
      shortlisted: number,
      interviewing: number,
      offered: number,
      hired: number,
      rejected: number
    }
  },
  score_distribution: {
    excellent: number,  // 80-100
    good: number,       // 60-79
    average: number,    // 40-59
    poor: number        // 0-39
  },
  average_score: number
}
```

---

## Scoring Tiers

| Tier | Range | Color | Meaning |
|------|-------|-------|---------|
| Excellent | 80-100 | Green (#52c41a) | Highly recommended |
| Good | 60-79 | Blue (#1890ff) | Recommended |
| Average | 40-59 | Orange (#faad14) | Consider carefully |
| Poor | 0-39 | Red (#ff4d4f) | Not recommended |

---

## Vietnamese Labels

### Statuses (状态)
- submitted = 已提交
- reviewing = 正在审查
- shortlisted = 入选 (Vào vòng trong)
- interviewing = 面试 (Phỏng vấn)
- offered = 已报价 (Đã offer)
- hired = 已聘用 (Đã tuyển)
- rejected = 已拒绝 (Từ chối)

### Components
- Technical = 技术 (Kỹ thuật)
- Behavioral = 行为 (Hành vi)
- Situational = 情景 (Tình huống)

---

## Common Tasks

### View candidate list for a job
1. Navigate to `/screening/jobs/{jobId}/candidates`
2. Use filters: status, min_score
3. Sort by overall_score (high to low)
4. Click row to view details

### Update candidate status
1. Open candidate detail
2. Click "Change Status" button
3. Select new status from dropdown
4. Confirm changes
5. API: `PUT /screening/applications/{id}/status?status=newStatus`

### View job statistics
1. Open job detail
2. See score distribution chart
3. View application counts by status
4. See average score

### Trigger screening
- Single: `POST /screening/applications/{id}/process`
- Bulk: `POST /screening/jobs/{id}/process-all`

---

## File Locations

### Backend Code
- Main file: `backend/app/api/v1/screening.py`
- Models: `backend/app/models/analysis.py`, `backend/app/models/application.py`
- Services: `backend/app/services/`

### Frontend Code
- Feature: `frontend-admin/src/app/features/screening/`
- Models: `screening/models/screening.model.ts`
- Service: `screening/services/screening.service.ts`
- Pages: `screening/pages/candidate-{list,detail}/`
- Components: `screening/components/{score-chart,interview-questions}/`

### Documentation
- API Reference: `docs/api-docs.md`
- Implementation: `docs/phase-5-implementation.md`
- Roadmap: `docs/project-roadmap.md`
- Codebase: `docs/codebase-summary.md`

---

## Key Dependencies

### Backend
- FastAPI - Web framework
- SQLAlchemy - ORM
- PostgreSQL - Database
- Celery - Background tasks
- Pydantic - Data validation

### Frontend
- Angular 18+ - Framework
- Ng-Zorro - UI components
- RxJS - Reactive programming
- TypeScript - Type safety

---

## Testing & Validation

### Test API Endpoints
```bash
# List candidates
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/v1/screening/jobs/1/analysis

# Get candidate detail
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/v1/screening/applications/5/analysis

# Update status
curl -X PUT -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/api/v1/screening/applications/5/status?status=shortlisted"
```

### Frontend Testing
- Navigate to `/screening` routes
- Test sorting/filtering on candidate list
- Test status update workflow
- Check Vietnamese labels display correctly

---

## Common Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on endpoint | Check job/application IDs exist |
| 401 Unauthorized | Verify JWT token in header |
| 403 Forbidden | Verify admin role for user |
| N+1 queries | Check database is using selectinload() |
| Slow list loading | Reduce page size or add indexes |
| Status not updating | Verify status value is valid |

---

## Performance Tips

### For Large Datasets
- Use pagination: `?page=1&size=20`
- Filter by min_score to reduce results
- Filter by status to narrow down
- Add indexes on (job_id, overall_score)

### Frontend Optimization
- Lazy load candidate details
- Use OnPush change detection
- Virtual scroll for >500 candidates

---

## Phase 6 Preview

Next phase adds:
- Interview scheduling integration
- Offer letter generation
- Hiring decision workflow
- Candidate communications

---

## Useful Commands

### Update repomix
```bash
repomix --output ./repomix-output.xml --style xml
```

### Run tests
```bash
pytest tests/
```

### Start backend
```bash
python -m app.main
```

### Start frontend
```bash
ng serve
```

---

## Related Documentation

- Full API docs: `api-docs.md`
- Implementation details: `phase-5-implementation.md`
- Architecture overview: `codebase-summary.md`
- Project status: `project-roadmap.md`

---

**Last Updated:** 2025-12-27
**Next Update:** After Phase 6 completion
