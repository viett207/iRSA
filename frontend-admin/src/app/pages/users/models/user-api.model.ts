import { User } from '../../../shared/models/user.model';

// Query params for list endpoint
export interface UserListParams {
  page?: number;
  page_size?: number;
  role?: 'candidate' | 'recruiter' | 'leader' | 'admin';
  is_active?: boolean;
  search?: string;
}

// Paginated response from backend
export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// POST body for creating user
export interface UserCreate {
  email: string;
  full_name: string;
  phone?: string;
  password: string;
  role: 'candidate' | 'recruiter' | 'leader' | 'admin';
  company_code?: string;
}

// PUT body for updating user
export interface UserUpdate {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: 'candidate' | 'recruiter' | 'leader' | 'admin';
  is_active?: boolean;
  password?: string;
  company_code?: string;
}
