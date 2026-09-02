/**
 * Application models for job portal.
 */

export interface Application {
  id: number;
  job_id: number;
  job_title: string;
  job_slug: string;
  job_department?: string;
  job_location?: string;
  resume_id: number;
  resume_filename: string;
  cover_letter?: string;
  public_status: string;
  submitted_at: string;
  resume_download_url?: string;
}

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

export type ApplicationStatus = 'in_review' | 'shortlisted' | 'not_selected' | 'selected';

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
