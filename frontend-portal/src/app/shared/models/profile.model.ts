/**
 * Profile models for job portal.
 */

export interface Profile {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  headline?: string;
  summary?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}

export interface ProfileUpdate {
  full_name?: string;
  phone?: string;
  headline?: string;
  summary?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}
