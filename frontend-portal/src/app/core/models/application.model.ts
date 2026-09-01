/**
 * Application models synchronized with backend/app/schemas/application.py
 */

export type CandidateInterviewResponseStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'reschedule_requested';

export type CandidateInterviewAction =
  | 'accepted'
  | 'declined'
  | 'reschedule_requested';

export interface CandidateInterviewActionRequest {
  response: CandidateInterviewAction;
  note?: string | null;
  proposed_date?: string | null;
}

export interface CandidateInterview {
  id: number;
  interview_date: string;
  interview_type: 'online' | 'offline' | string;
  location: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | string;
  candidate_response?: CandidateInterviewResponseStatus;
  candidate_response_note?: string | null;
  candidate_proposed_date?: string | null;
  candidate_responded_at?: string | null;
}

export interface InterviewInvitation {
  id: number;
  application_id: number;
  job_id: number;
  job_title: string;
  job_slug: string;
  job_department?: string | null;
  scheduler_name: string | null;
  company_name: string | null;
  interview_date: string;
  interview_type: 'online' | 'offline' | string;
  location: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | string;
  candidate_response: CandidateInterviewResponseStatus;
  candidate_response_note: string | null;
  candidate_proposed_date: string | null;
  candidate_responded_at: string | null;
}

export interface InterviewInvitationListResponse {
  items: InterviewInvitation[];
  total: number;
  page: number;
  size: number;
}

export type CandidateInterviewResponse = CandidateInterview;

export type ApplicationInternalStatus =
  | 'submitted'
  | 'reviewing'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'rejected'
  | string;

export type ApplicationStatus = 'in_review' | 'shortlisted' | 'not_selected' | 'selected';

export interface Application {
  id: number;
  job_id: number;
  job_title: string;
  job_slug: string;
  job_department: string | null;
  job_location: string | null;
  resume_id: number;
  resume_filename: string;
  cover_letter: string | null;
  contact_phone: string | null;
  status: ApplicationInternalStatus;
  public_status: string;
  submitted_at: string;
  resume_download_url: string | null;
  interviews: CandidateInterview[];
}

export type ApplicationResponse = Application;
export type ApplicationDetailResponse = Application;

export interface ApplicationStatusCounts {
  in_review: number;
  shortlisted: number;
  not_selected: number;
  selected: number;
}

export interface ApplicationListResponse {
  items: Application[];
  total: number;
  page: number;
  size: number;
  status_counts: ApplicationStatusCounts;
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  in_review: 'Đang xem xét',
  shortlisted: 'Đã chọn vòng 2',
  not_selected: 'Không phù hợp',
  selected: 'Đã tuyển chọn',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  in_review: 'processing',
  shortlisted: 'warning',
  not_selected: 'error',
  selected: 'success',
};
