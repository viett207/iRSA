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
