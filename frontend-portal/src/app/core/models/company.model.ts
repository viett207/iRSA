/**
 * Company models synchronized with backend/app/schemas/company.py
 */

import { PublicJobListItem } from './job.model';

export interface CompanyBase {
  company_code: string;
  company_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  employee_size: string | null;
  headquarters: string | null;
  website_url: string | null;
  introduction_vi: string | null;
  culture_vi: string | null;
  workplace_images: string[];
  location: string | null;
  industry: string | null;
}

export interface CompanyResponse extends CompanyBase {
  id: number;
  created_at: string;
  updated_at: string | null;
}

export type Company = CompanyResponse;

export interface CompanyUpdate {
  company_name?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  employee_size?: string | null;
  headquarters?: string | null;
  website_url?: string | null;
  introduction_vi?: string | null;
  culture_vi?: string | null;
  workplace_images?: string[] | null;
  location?: string | null;
  industry?: string | null;
}

export interface CompanyList {
  items: CompanyResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
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

export interface CompanyDetail extends CompanyBase {
  jobs: PublicJobListItem[];
  total_jobs: number;
}
