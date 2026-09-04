/**
 * Public job models for job portal.
 */

export interface PublicJob {
  id: number;
  slug: string;
  title_vi: string;
  description_vi?: string;
  requirements_vi?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  application_deadline?: string;
  published_at?: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  min_experience_years: number;
  max_experience_years?: number;
  min_education?: string;
}

export interface PublicJobListItem {
  id: number;
  slug: string;
  title_vi: string;
  department?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  published_at?: string;
  application_deadline?: string;
  applications_count: number;
  must_have_skills?: string[];
  min_experience_years?: number;
  max_experience_years?: number;
  company_name?: string;
  company_code?: string;
  description_vi?: string;
}

export interface PublicJobListResponse {
  items: PublicJobListItem[];
  total: number;
  page: number;
  size: number;
}

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

export interface ActiveCompany {
  company_code: string;
  company_name: string;
  location: string | null;
  industry: string | null;
  job_count: number;
  latest_published_at: string | null;
}

export interface ActiveCompanyListResponse {
  items: ActiveCompany[];
  total: number;
}

export interface CompanyOverviewStats {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  in_progress_applications: number;
  hr_members: number;
}

export interface CompanyJobSummary {
  id: number;
  slug?: string | null;
  title_vi: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  status: string;
  applications_count: number;
  created_at: string;
  application_deadline: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
}

export interface CompanyEntity {
  id: number;
  company_code: string;
  company_name: string;
  location: string | null;
  industry: string | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CompanyOverview {
  company: CompanyEntity;
  stats: CompanyOverviewStats;
  jobs: CompanyJobSummary[];
  company_code?: string;
  company_name?: string;
  location?: string | null;
  industry?: string | null;
  description?: string | null;
  total_jobs?: number;
}

export type CompanyDetail = CompanyOverview;

export interface PublicCompanyItem {
  id: number;
  company_code: string;
  company_name: string;
  location: string | null;
  industry: string | null;
  description: string | null;
  active_jobs_count: number;
  created_at: string | null;
}

export interface PublicCompanyListResponse {
  items: PublicCompanyItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CompanyListParams {
  page?: number;
  page_size?: number;
  search?: string;
  industry?: string;
  location?: string;
}

export interface CVJobMatchItem {
  id: number;
  slug: string;
  title_vi: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  published_at: string | null;
  total_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  matched_skills: string[];
}

export interface CVJobSearchResponse {
  items: CVJobMatchItem[];
  total: number;
  page: number;
  size: number;
}
