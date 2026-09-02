// Company entity
export interface Company {
  id: number;
  company_code: string;
  company_name: string;
  location: string | null;
  industry: string | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

// Query params for list endpoint
export interface CompanyListParams {
  page?: number;
  page_size?: number;
  search?: string;
  industry?: string;
  location?: string;
}

// Paginated response from backend
export interface CompanyListResponse {
  items: Company[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// POST body for creating company
export interface CompanyCreate {
  company_code: string;
  company_name: string;
  location?: string;
  industry?: string;
  description?: string | null;
}

// PUT body for updating company
export interface CompanyUpdate {
  company_name?: string;
  location?: string;
  industry?: string;
  description?: string | null;
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
  title_vi: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  status: string;
  applications_count: number;
  created_at: string;
  application_deadline: string | null;
}

export interface CompanyOverview {
  company: Company;
  stats: CompanyOverviewStats;
  jobs: CompanyJobSummary[];
}
