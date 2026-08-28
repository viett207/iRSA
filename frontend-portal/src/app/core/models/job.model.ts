/**
 * Job & JobCriteria models synchronized with backend/app/schemas/job.py
 */

export type EducationLevel = 'high_school' | 'bachelor' | 'master' | 'phd';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type JobStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'closed';

/** Base schema for job requirements criteria */
export interface JobCriteriaBase {
  must_have_skills: string[];
  nice_to_have_skills: string[];
  min_experience_years: number;
  max_experience_years: number | null;
  min_education: EducationLevel | string | null;
  weight_skills: number;
  weight_experience: number;
  weight_education: number;
}

/** Response schema for job criteria */
export interface JobCriteria extends JobCriteriaBase {
  id: number;
}

/** Alias for compatibility */
export type JobCriteriaResponse = JobCriteria;

/** Full Job response schema (HR / Admin view) */
export interface Job {
  id: number;
  title_vi: string;
  description_vi: string | null;
  requirements_vi: string | null;
  benefits_vi: string | null;
  slug: string;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType | string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: JobStatus | string;
  is_published: boolean;
  published_at: string | null;
  application_deadline: string | null;
  created_by: number;
  creator_name: string;
  approved_by: number | null;
  approver_name: string | null;
  approved_at: string | null;
  criteria: JobCriteria | null;
  applications_count: number;
  created_at: string;
  updated_at: string | null;
}

/** Alias for compatibility */
export type JobResponse = Job;

/** Public job response for candidates (no sensitive HR info) */
export interface PublicJob {
  id: number;
  slug: string;
  title_vi: string;
  description_vi: string | null;
  requirements_vi: string | null;
  benefits_vi: string | null;
  company_name: string | null;
  company_code: string | null;
  company_logo_url: string | null;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType | string | null;
  salary_min: number | null;
  salary_max: number | null;
  application_deadline: string | null;
  published_at: string | null;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  min_experience_years: number;
  max_experience_years: number | null;
  min_education: EducationLevel | string | null;
}

export type PublicJobResponse = PublicJob;

/** Simplified job item for public listing */
export interface PublicJobListItem {
  id: number;
  slug: string;
  title_vi: string;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType | string | null;
  salary_min: number | null;
  salary_max: number | null;
  published_at: string | null;
  application_deadline: string | null;
  applications_count: number;
  must_have_skills: string[];
  min_experience_years: number | null;
  max_experience_years: number | null;
  company_name: string | null;
  company_code: string | null;
  description_vi: string | null;
}

/** Paginated public job list response */
export interface PublicJobListResponse {
  items: PublicJobListItem[];
  total: number;
  page: number;
  size: number;
}

/** Paginated internal job list response */
export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/** Search query parameters for job search */
export interface JobSearchParams {
  q?: string;
  location?: string;
  department?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  min_experience?: number;
  max_experience?: number;
  company_code?: string;
  order_by?: string;
  page?: number;
  size?: number;
}

/** CV Job Search AI recommendation item */
export interface CVJobMatchItem {
  id: number;
  slug: string;
  title_vi: string;
  company_name: string | null;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType | string | null;
  salary_min: number | null;
  salary_max: number | null;
  published_at: string | null;
  total_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

/** CV Job Search response */
export interface CVJobSearchResponse {
  items: CVJobMatchItem[];
  total: number;
  page: number;
  size: number;
}
