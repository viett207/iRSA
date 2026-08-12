# iRSA Documentation

**Last Updated:** 2025-12-27
**Current Phase:** Phase 5 - HR Screening Dashboard (IN PROGRESS)
**Project Status:** 85% complete (Phase 5)

---

## Welcome

Welcome to the iRSA documentation hub. This comprehensive guide covers the Recruiting System Architecture from architecture to API reference to implementation details.

**Quick Navigation:**
- **Starting out?** → Read [Quick Reference](#quick-reference)
- **Need API details?** → See [api-docs.md](api-docs.md)
- **Understanding architecture?** → Review [codebase-summary.md](codebase-summary.md)
- **Implementing Phase 5?** → Check [phase-5-implementation.md](phase-5-implementation.md)
- **Project status?** → View [project-roadmap.md](project-roadmap.md)

---

## Documentation Overview

### Core Documents

#### 1. **Project Roadmap** (`project-roadmap.md`)
The master document tracking project status across all phases.

**Contains:**
- Project overview and current status
- All 7 phases with completion status
- Key milestones and timeline
- Technical stack specifications
- Success metrics and changelog
- Resource allocation

**Read this if:** You need overall project context, want to see what's been completed, or plan future work.

---

#### 2. **Codebase Summary** (`codebase-summary.md`)
Complete technical overview of the system architecture and implementation.

**Contains:**
- Directory structure with file paths
- Phase-by-phase feature breakdown
- Backend and frontend architecture
- 6 screening API endpoints (Phase 5)
- Database schema overview
- Technology stack
- Testing coverage
- Recent changes

**Read this if:** You're new to the codebase, need to understand file organization, or want architecture details.

---

#### 3. **API Documentation** (`api-docs.md`)
Complete API reference with examples and specifications.

**Contains:**
- 6 screening endpoints (fully documented)
- Parameter specifications and validation
- Response schemas with JSON examples
- Status codes and error handling
- Status workflow diagrams
- Scoring system explanation
- Angular integration examples
- Performance notes

**Read this if:** You're building API integrations, debugging API issues, or implementing features that call the API.

---

#### 4. **Phase 5 Implementation Guide** (`phase-5-implementation.md`)
Detailed technical guide for Phase 5 HR Screening Dashboard.

**Contains:**
- Backend implementation details (6 new endpoints)
- Frontend component structure (4 main components)
- TypeScript models and interfaces
- Service method specifications
- Data flow diagrams
- Error handling patterns
- Status workflow explanation
- Scoring system breakdown
- Performance considerations
- Testing strategy
- Deployment checklist

**Read this if:** You're implementing Phase 5, need to understand component design, or want to follow the implementation pattern.

---

#### 5. **Quick Reference Guide** (`QUICK_REFERENCE.md`)
One-page reference for common tasks and quick lookups.

**Contains:**
- Documentation map table
- API endpoints quick lookup
- Frontend component tree
- Status workflow visualization
- Data models summary
- Scoring tiers reference
- Vietnamese labels
- Common tasks guide
- File locations
- Troubleshooting tips

**Read this if:** You need quick answers, want to find something specific, or are looking for reference tables.

---

#### 6. **Documentation Updates** (`DOCUMENTATION_UPDATES.md`)
Summary of all documentation changes for Phase 5.

**Contains:**
- Files created and updated
- Content coverage analysis
- Changed files in codebase
- Documentation quality metrics
- Standards applied
- Cross-references
- Next documentation updates
- Review checklist

**Read this if:** You want to understand what documentation was added, need a summary of changes, or want to verify documentation completeness.

---

## Quick Start Guide

### For Different Audiences

**Frontend Developers:**
1. Start with [Quick Reference](QUICK_REFERENCE.md) - Component Tree section
2. Read [codebase-summary.md](codebase-summary.md) - Frontend Structure section
3. Review [api-docs.md](api-docs.md) - Endpoint specs and Integration Notes
4. Check [phase-5-implementation.md](phase-5-implementation.md) - Frontend Components section

**Backend Developers:**
1. Start with [codebase-summary.md](codebase-summary.md) - Backend Implementation section
2. Review [api-docs.md](api-docs.md) - All endpoint documentation
3. Check [phase-5-implementation.md](phase-5-implementation.md) - Backend Implementation section
4. See [project-roadmap.md](project-roadmap.md) - Technical Stack

**New Team Members:**
1. Read [project-roadmap.md](project-roadmap.md) - Get overall context
2. Review [codebase-summary.md](codebase-summary.md) - Understand directory structure
3. Use [Quick Reference](QUICK_REFERENCE.md) - For quick lookups
4. Explore actual code files referenced in documentation

**Project Managers:**
1. Check [project-roadmap.md](project-roadmap.md) - Timeline and milestones
2. See [phase-5-implementation.md](phase-5-implementation.md) - Deployment checklist
3. Review [DOCUMENTATION_UPDATES.md](DOCUMENTATION_UPDATES.md) - Completion status

---

## Project Structure

### Repository Layout

```
iRSA/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py
│   │   │   ├── jobs.py
│   │   │   ├── screening.py          ← Phase 5 NEW
│   │   │   └── users.py
│   │   ├── models/
│   │   ├── services/
│   │   ├── tasks/
│   │   └── main.py
│   ├── alembic/
│   │   └── versions/
│   │       └── 004_screening_pipeline.py
│   ├── tests/
│   └── docs/                         ← You are here
├── frontend-admin/
│   └── src/app/features/screening/   ← Phase 5 NEW
│       ├── models/
│       ├── services/
│       ├── pages/
│       ├── components/
│       └── screening.routes.ts
└── frontend-candidate/
    └── src/app/features/
```

---

## Key Features by Phase

| Phase | Feature | Status | Doc |
|-------|---------|--------|-----|
| 1 | Foundation & Auth | ✓ Complete | [Roadmap](project-roadmap.md) |
| 2 | Job Portal | ✓ Complete | [Roadmap](project-roadmap.md) |
| 3 | Candidate Portal | ✓ Complete | [Roadmap](project-roadmap.md) |
| 4 | Screening Pipeline | ✓ Complete | [Roadmap](project-roadmap.md) |
| 5 | HR Dashboard | 🔄 In Progress | [Implementation](phase-5-implementation.md) |
| 6 | Hiring Workflow | 📋 Planned | [Roadmap](project-roadmap.md) |
| 7 | Production Ready | 📋 Planned | [Roadmap](project-roadmap.md) |

---

## Technology Stack Summary

### Backend
- **FastAPI** - Async Python web framework
- **SQLAlchemy 2.0** - Async ORM
- **PostgreSQL** - Database with JSONB
- **Celery** - Background task processing
- **Google Gemini / DeepSeek** - LLM analysis

### Frontend
- **Angular 18+** - Modern framework
- **Ng-Zorro** - Enterprise UI components
- **TypeScript** - Type-safe development
- **RxJS** - Reactive programming

---

## Phase 5: HR Screening Dashboard

### What Was Implemented

**Backend:**
- 6 new screening API endpoints
- Analysis results retrieval (paginated, filtered)
- Application status workflow management
- Job statistics and metrics

**Frontend:**
- Screening feature module with 4 main components
- Candidate list (pagination, sorting, filtering)
- Candidate detail with full analysis breakdown
- Score distribution charts
- Interview questions display

### Current Status
- Backend: ✓ Complete
- Frontend: ✓ Complete
- Integration: ✓ Complete
- Testing: In progress
- Documentation: ✓ Complete

### Endpoints Added
1. `GET /screening/jobs/{id}/analysis` - List candidates
2. `GET /screening/applications/{id}/analysis` - Candidate details
3. `POST /screening/applications/{id}/process` - Trigger screening
4. `POST /screening/jobs/{id}/process-all` - Bulk screening
5. `PUT /screening/applications/{id}/status` - Update status
6. `GET /screening/jobs/{id}/stats` - Job metrics

---

## Data Models Reference

### Main Entities

**ApplicationStatus** - 7-state workflow
```
submitted → reviewing → shortlisted → interviewing → offered/hired/rejected
```

**AnalysisResult** - AI-generated candidate assessment
```
{
  overall_score: 0-100,
  skills_score: 40% weight,
  experience_score: 30% weight,
  education_score: 20% weight,
  culture_score: 10% weight,
  interview_questions: [technical, behavioral, situational],
  strengths, weaknesses, red_flags, culture_signals
}
```

**ScreeningStats** - Job-level metrics
```
{
  application_counts: { total, by_status },
  score_distribution: { excellent, good, average, poor },
  average_score
}
```

See [api-docs.md](api-docs.md) for complete schema documentation.

---

## Common Tasks

### Finding Information
- **API endpoint details** → [api-docs.md](api-docs.md)
- **Component structure** → [codebase-summary.md](codebase-summary.md)
- **Implementation example** → [phase-5-implementation.md](phase-5-implementation.md)
- **Quick lookup** → [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Project status** → [project-roadmap.md](project-roadmap.md)

### Development Tasks
- **Add new API endpoint** → Follow pattern in [api-docs.md](api-docs.md)
- **Create new component** → Reference [phase-5-implementation.md](phase-5-implementation.md)
- **Update database schema** → Check alembic migrations
- **Debug API issue** → See [api-docs.md](api-docs.md) - Error Responses

---

## Documentation Standards

All documentation follows these standards:
- ✓ Clear hierarchical structure
- ✓ Consistent naming conventions
- ✓ Code examples with syntax highlighting
- ✓ Cross-references to related docs
- ✓ Vietnamese labels where applicable
- ✓ Practical examples and use cases
- ✓ Complete API specifications
- ✓ Error handling documented

---

## Navigation Tips

### Using This Documentation

1. **For Overview:** Start with [project-roadmap.md](project-roadmap.md)
2. **For Details:** Navigate to specific doc based on your task
3. **For Quick Answers:** Use [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
4. **For Examples:** Check [phase-5-implementation.md](phase-5-implementation.md)
5. **For Completeness:** See [codebase-summary.md](codebase-summary.md)

### Document Cross-References

Each document links to related documentation:
- **Roadmap** → Links to implementation guides
- **API Docs** → Links to codebase for context
- **Codebase** → Links to API documentation
- **Implementation** → Links to API and codebase
- **Quick Reference** → Links to detailed documents

---

## Maintenance & Updates

### Documentation Version
- **Current Version:** v1.0
- **Last Updated:** 2025-12-27
- **Next Update:** After Phase 6 completion

### Update Schedule
- When features are added (new phase)
- When API changes (new endpoints)
- When issues are discovered
- When improvements are made

### Contributing to Documentation
See [DOCUMENTATION_UPDATES.md](DOCUMENTATION_UPDATES.md) for:
- Standards being used
- Files being maintained
- Update procedures

---

## Support & Questions

### Finding Help

| Question | Where to Look |
|----------|---------------|
| "How do I call API X?" | [api-docs.md](api-docs.md) |
| "Where is file Y?" | [codebase-summary.md](codebase-summary.md) |
| "How do I implement Z?" | [phase-5-implementation.md](phase-5-implementation.md) |
| "What's the project status?" | [project-roadmap.md](project-roadmap.md) |
| "How do I do X quickly?" | [QUICK_REFERENCE.md](QUICK_REFERENCE.md) |

### Reporting Issues

If you find outdated or incorrect documentation:
1. Note the file and section
2. Provide the correct information
3. Update the documentation or report to team

---

## File Manifest

| File | Purpose | Size | Last Updated |
|------|---------|------|--------------|
| README.md | This file - Documentation index | 10KB | 2025-12-27 |
| codebase-summary.md | Architecture and code overview | 11KB | 2025-12-27 |
| api-docs.md | Complete API reference | 10KB | 2025-12-27 |
| phase-5-implementation.md | Phase 5 implementation guide | 13KB | 2025-12-27 |
| project-roadmap.md | Project status and timeline | 11KB | 2025-12-27 |
| QUICK_REFERENCE.md | Quick lookup guide | 9KB | 2025-12-27 |
| DOCUMENTATION_UPDATES.md | Documentation change log | 10KB | 2025-12-27 |

**Total Documentation:** ~74 KB across 7 files

---

## Next Steps

### For Development
1. Review relevant documentation for your task
2. Refer to code examples provided
3. Follow established patterns
4. Keep documentation updated as you develop

### For Project Management
1. Check [project-roadmap.md](project-roadmap.md) for timeline
2. Use deployment checklist from [phase-5-implementation.md](phase-5-implementation.md)
3. Track Phase 6 planning in roadmap

### For New Team Members
1. Read this README
2. Check [Quick Reference](QUICK_REFERENCE.md)
3. Review [codebase-summary.md](codebase-summary.md)
4. Browse actual code with documentation as reference

---

**Documentation Status:** ✓ Complete for Phase 5
**Ready for:** Feature development, code review, testing, deployment

---

## Quick Links

- [Project Roadmap](project-roadmap.md) - Overall status
- [API Documentation](api-docs.md) - Endpoint reference
- [Codebase Summary](codebase-summary.md) - Architecture overview
- [Implementation Guide](phase-5-implementation.md) - Phase 5 details
- [Quick Reference](QUICK_REFERENCE.md) - Fast lookups
- [Updates Summary](DOCUMENTATION_UPDATES.md) - Change log

---

**Last Updated:** 2025-12-27
**Maintained by:** Documentation Team
**Next Review:** 2026-01-15
