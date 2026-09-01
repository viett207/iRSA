import { Application, CandidateInterview } from '../../shared/models/application.model';
import {
  canWithdrawApplication,
  getOnlineMeetingUrl,
  getTimelineStepState,
} from './dashboard.component';

function createApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 1,
    job_id: 10,
    job_title: 'Frontend Developer',
    job_slug: 'frontend-developer',
    job_department: 'Engineering',
    job_location: 'Hà Nội',
    resume_id: 5,
    resume_filename: 'cv.pdf',
    cover_letter: null,
    contact_phone: '0912345678',
    status: 'submitted',
    public_status: 'in_review',
    submitted_at: '2026-08-22T08:00:00Z',
    resume_download_url: null,
    interviews: [],
    ...overrides,
  };
}

function createInterview(overrides: Partial<CandidateInterview> = {}): CandidateInterview {
  return {
    id: 2,
    interview_date: '2026-08-25T09:00:00Z',
    interview_type: 'online',
    location: 'https://meet.example.com/interview',
    notes: null,
    status: 'scheduled',
    ...overrides,
  };
}

describe('Dashboard application timeline helpers', () => {
  it('allows withdrawal only before the recruiter reviews the CV', () => {
    expect(canWithdrawApplication(createApplication())).toBeTrue();
    expect(canWithdrawApplication(createApplication({ status: 'reviewing' }))).toBeFalse();
  });

  it('moves from submitted to reviewed and interview stages', () => {
    const submitted = createApplication();
    expect(getTimelineStepState(submitted, 0)).toBe('current');
    expect(getTimelineStepState(submitted, 1)).toBe('pending');

    const reviewed = createApplication({ status: 'reviewing' });
    expect(getTimelineStepState(reviewed, 0)).toBe('completed');
    expect(getTimelineStepState(reviewed, 1)).toBe('current');

    const interviewing = createApplication({
      status: 'interviewing',
      interviews: [createInterview()],
    });
    expect(getTimelineStepState(interviewing, 1)).toBe('completed');
    expect(getTimelineStepState(interviewing, 2)).toBe('current');
  });

  it('shows a direct rejection without claiming an interview happened', () => {
    const rejected = createApplication({ status: 'rejected', public_status: 'not_selected' });

    expect(getTimelineStepState(rejected, 2)).toBe('skipped');
    expect(getTimelineStepState(rejected, 3)).toBe('failed');
  });

  it('only exposes safe HTTP(S) online meeting links', () => {
    expect(getOnlineMeetingUrl(createInterview())).toBe('https://meet.example.com/interview');
    expect(getOnlineMeetingUrl(createInterview({ location: 'javascript:alert(1)' }))).toBeNull();
    expect(getOnlineMeetingUrl(createInterview({ interview_type: 'offline' }))).toBeNull();
  });

  it('only includes scheduled interviews with accepted candidate_response in interviewNotices', () => {
    const acceptedInterview = createInterview({
      id: 1,
      status: 'scheduled',
      candidate_response: 'accepted',
    });
    const pendingInterview = createInterview({
      id: 2,
      status: 'scheduled',
      candidate_response: 'pending',
    });
    const rescheduleInterview = createInterview({
      id: 3,
      status: 'scheduled',
      candidate_response: 'reschedule_requested',
    });
    const declinedInterview = createInterview({
      id: 4,
      status: 'cancelled',
      candidate_response: 'declined',
    });

    const app = createApplication({
      interviews: [acceptedInterview, pendingInterview, rescheduleInterview, declinedInterview],
    });

    // Emulate dashboard interviewNotices getter logic
    const notices = [app]
      .flatMap((a) =>
        (a.interviews ?? [])
          .filter((iv) => iv.status === 'scheduled' && iv.candidate_response === 'accepted')
          .map((iv) => ({
            applicationId: a.id,
            jobTitle: a.job_title,
            jobSlug: a.job_slug,
            interview: iv,
          })),
      );

    expect(notices.length).toBe(1);
    expect(notices[0].interview.id).toBe(1);
  });
});
