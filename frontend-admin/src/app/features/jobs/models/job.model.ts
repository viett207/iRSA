export interface JobCriteria {
  id?: number;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  min_experience_years: number;
  max_experience_years?: number;
  min_education?: 'high_school' | 'bachelor' | 'master' | 'phd';
  weight_skills?: number;
  weight_experience?: number;
  weight_education?: number;
}

export type JobStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'closed';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship';

export interface Job {
  id: number;

  // Vietnamese content
  title_vi: string;
  description_vi?: string;
  requirements_vi?: string;

  // Common fields
  slug: string;
  company_code?: string;
  company_name?: string;
  department?: string;
  location?: string;
  employment_type?: EmploymentType;
  salary_min?: number;
  salary_max?: number;

  // Status
  status: JobStatus;
  is_published: boolean;
  published_at?: string;
  application_deadline?: string;

  // Creator/Approver
  created_by: number;
  creator_name: string;
  approved_by?: number;
  approver_name?: string;
  approved_at?: string;
  // Related
  criteria?: JobCriteria;
  applications_count: number;

  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface JobCreate {
  title_vi: string;
  description_vi?: string;
  requirements_vi?: string;
  company_code?: string;
  department?: string;
  location?: string;
  employment_type?: EmploymentType;
  salary_min?: number;
  salary_max?: number;
  application_deadline?: string;
  criteria?: Omit<JobCriteria, 'id'>;
}

export interface JobUpdate extends Partial<JobCreate> {}

export interface ApprovalRequest {
  comment?: string;
}

export interface RejectionRequest {
  reason: string;
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Bản nháp',
  pending_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  active: 'Đang tuyển',
  closed: 'Đã đóng',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft: 'default',
  pending_approval: 'processing',
  approved: 'success',
  rejected: 'error',
  active: 'success',
  closed: 'default',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Toàn thời gian',
  part_time: 'Bán thời gian',
  contract: 'Hợp đồng',
  internship: 'Thực tập',
};

export const VIETNAM_LOCATIONS: string[] = [
  'Hà Nội',
  'TP Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Biên Hòa',
  'Nha Trang',
  'Huế',
  'Buôn Ma Thuột',
  'Quy Nhơn',
  'Vũng Tàu',
  'Thái Nguyên',
  'Nam Định',
  'Vinh',
  'Hạ Long',
  'Thanh Hóa',
  'Bắc Ninh',
  'Thái Bình',
  'Đà Lạt',
  'Phan Thiết',
  'Long Xuyên',
  'Mỹ Tho',
  'Rạch Giá',
  'Cà Mau',
  'Pleiku',
  'Tam Kỳ',
  'Kon Tum',
  'Tuy Hòa',
  'Bảo Lộc',
  'Remote',
];

export const EDUCATION_LABELS: Record<string, string> = {
  high_school: 'THPT',
  bachelor: 'Cử nhân',
  master: 'Thạc sĩ',
  phd: 'Tiến sĩ',
};

// --- Applicant (for recruiter view) ---

export type ApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'rejected';

export interface Applicant {
  id: number;
  candidate_name: string;
  candidate_email: string;
  resume_filename: string;
  status: ApplicationStatus;
  public_status: string;
  submitted_at: string;
  updated_at?: string;
  total_score?: number | null;
  skill_match_score?: number | null;
  experience_score?: number | null;
  education_score?: number | null;
  ai_score?: number | null;
  ai_evaluated_at?: string | null;
  has_ai_evaluation?: boolean;
  ai_recommendation?: string | null;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'submitted',
  'reviewing',
  'shortlisted',
  'interviewing',
  'offered',
  'hired',
  'rejected',
];

// Valid transitions from each status (allows free transition to any other valid status)
export const STATUS_TRANSITIONS: Record<string, ApplicationStatus[]> = {
  submitted: ALL_STATUSES.filter((s) => s !== 'submitted'),
  reviewing: ALL_STATUSES.filter((s) => s !== 'reviewing'),
  shortlisted: ALL_STATUSES.filter((s) => s !== 'shortlisted'),
  interviewing: ALL_STATUSES.filter((s) => s !== 'interviewing'),
  offered: ALL_STATUSES.filter((s) => s !== 'offered'),
  hired: ALL_STATUSES.filter((s) => s !== 'hired'),
  rejected: ALL_STATUSES.filter((s) => s !== 'rejected'),
};

export interface ApplicantDetail extends Applicant {
  resume_raw_text: string | null;
  cover_letter: string | null;
}

export interface ApplicantListResponse {
  items: Applicant[];
  total: number;
  page: number;
  size: number;
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  submitted: 'Mới nộp CV',
  reviewing: 'Đang xem xét',
  shortlisted: 'Đạt sơ loại (Chờ hẹn lịch)',
  interviewing: 'Đang phỏng vấn',
  offered: 'Đã Pass PV (Đề xuất tuyển)',
  hired: 'Đã trúng tuyển',
  rejected: 'Không đạt',
};

// --- Match Details (for scoring detail popup) ---

export interface ResumeSnippet {
  keyword: string;
  context: string;
  section: string;
}

export interface MatchDetailsResponse {
  candidate_name: string;
  total_score: number;
  skill_match_score: number;
  experience_score: number;
  education_score: number;
  match_details: {
    skills: {
      score: number;
      matched_must: string[];
      matched_nice: string[];
      missing_must: string[];
      missing_nice: string[];
      match_sections: Record<string, string>;
      search_section: string;
    };
    experience: {
      score: number;
      detected_years: number;
      required_min: number;
      required_max: number | null;
      search_section: string;
    };
    education: {
      score: number;
      detected_level: string | null;
      required_level: string | null;
      search_section: string;
    };
    weights?: {
      skills: number;
      experience: number;
      education: number;
    };
    sections_found: string[];
    resume_keyword_count: number;
  };
  resume_snippets: ResumeSnippet[];
  scored_at: string;
}

// --- Shortlisted / AI Evaluation ---

export interface ShortlistedApplicant {
  id: number;
  job_id: number;
  job_title: string;
  job_created_by: number | null;
  candidate_name: string;
  candidate_email: string;
  resume_filename: string;
  status: string;
  submitted_at: string | null;
  total_score: number | null;
  ai_score: number | null;
  ai_evaluated_at: string | null;
  has_ai_evaluation: boolean;
}

export interface ShortlistedListResponse {
  items: ShortlistedApplicant[];
  total: number;
  page: number;
  size: number;
}

export interface InterviewingApplicant {
  id: number;
  job_id: number;
  job_title: string;
  job_created_by: number | null;
  candidate_name: string;
  candidate_email: string;
  status: string;
  total_score: number | null;
  ai_score: number | null;
  has_ai_evaluation: boolean;
  has_completed_interview: boolean;
  updated_at: string | null;
}

export interface InterviewingListResponse {
  items: InterviewingApplicant[];
  total: number;
  page: number;
  size: number;
}

export interface InterviewPassedApplicant {
  id: number;
  job_id: number;
  job_title: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  total_score: number | null;
  ai_score: number | null;
  updated_at: string | null;
}

export interface InterviewPassedListResponse {
  items: InterviewPassedApplicant[];
  total: number;
  page: number;
  size: number;
}

export interface AiEvaluationResponse {
  application_id: number;
  ai_score: number | null;
  ai_evaluation: AiEvaluation | null;
  ai_evaluated_at: string | null;
  has_evaluation: boolean;
}

export interface ProcessStep {
  step_number: number;
  step_name: string;
  agent_node: string;
  status: 'completed' | 'in_progress' | 'warning' | 'skipped';
  summary: string;
  details?: string;
}

export interface AiEvaluation {
  overall_score: number;
  overall_assessment: string;
  recommendation: string;
  skill_assessments: AiSkillAssessment[];
  experience_assessment: {
    detected_years: number;
    relevant_years: number;
    confidence: number;
    summary: string;
  };
  education_assessment: {
    detected_level: string;
    field_relevant: boolean;
    summary: string;
  };
  strengths: string[];
  concerns: string[];
  interview_questions?: AiInterviewQuestion[];
  process_steps?: ProcessStep[];
  verification_passed?: boolean;
  verification_feedback?: string;
  reflection_attempts?: number;
}

export interface AiInterviewQuestion {
  question: string;
  category: string;
  target_skill: string | null;
  purpose: string;
  good_signs?: string[];
  red_flags?: string[];
  grading_guide?: string;
}

export interface CvJdCompareResponse {
  application_id: number;
  candidate_name: string;
  candidate_email: string;
  resume_filename: string;
  cv_text: string;
  job_id: number;
  job_title: string;
  job_department?: string | null;
  job_location?: string | null;
  job_description?: string | null;
  job_requirements?: string | null;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  min_experience_years: number;
  max_experience_years?: number | null;
  min_education?: string | null;
  matched_skills: string[];
  missing_skills: string[];
  matched_keywords: string[];
  total_score: number | null;
  skill_match_score: number | null;
  experience_score: number | null;
  education_score: number | null;
}

export interface AiSkillAssessment {
  skill: string;
  found: boolean;
  confidence: number;
  evidence: string;
  level: string;
}

// --- Interview Scheduling ---

export interface Interview {
  id: number;
  application_id: number;
  scheduled_by: number;
  scheduler_name: string | null;
  interview_date: string;
  interview_type: 'online' | 'offline';
  location: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  questions?: AiInterviewQuestion[];
  answers?: Record<string, InterviewAnswer>;
  overall_score?: number | null;
  overall_feedback?: string | null;
  recommendation?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InterviewAnswer {
  question_index: number;
  question_text: string;
  audio_url?: string | null;
  audio_path?: string | null;
  transcript: string;
  score: number;
  assessment: string;
  strengths: string[];
  improvements: string[];
  star_analysis?: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
  } | null;
  follow_up_question?: string | null;
  evaluated_at?: string;
}

export interface InterviewDataResponse {
  application_id: number;
  job_id: number;
  job_title: string;
  job_description: string;
  job_criteria: {
    must_have_skills: string[];
    nice_to_have_skills: string[];
    min_experience_years: number;
  };
  candidate: {
    id: number | null;
    name: string;
    email: string;
    phone: string;
  };
  application_status: string;
  screening_ai_score: number | null;
  screening_total_score: number | null;
  interview: Interview | null;
  suggested_questions: AiInterviewQuestion[];
  questions: AiInterviewQuestion[];
  answers: Record<string, InterviewAnswer>;
}

export interface InterviewCreateRequest {
  interview_date: string;
  interview_type: 'online' | 'offline';
  location?: string;
  notes?: string;
}

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  submitted: 'default',
  shortlisted: 'green',
  interviewing: 'geekblue',
  offered: 'gold',
  hired: 'success',
  rejected: 'error',
};
