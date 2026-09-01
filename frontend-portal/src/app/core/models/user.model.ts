/**
 * User and Auth models synchronized with backend/app/schemas/user.py and backend/app/schemas/auth.py
 */

export type UserRole = 'candidate' | 'recruiter' | 'leader' | 'admin';
export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected' | string;

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole | string;
  avatar_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  company_code: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string | null;
}

export type UserResponse = User;

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  role: UserRole | string;
  phone?: string | null;
  company_code?: string | null;
}

export interface UserUpdate {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
  role?: UserRole | string | null;
  password?: string | null;
  company_code?: string | null;
}

export interface UserList {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
}

export interface HRRegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  company_code: string;
}

export interface RefreshRequest {
  refresh_token?: string | null;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}
