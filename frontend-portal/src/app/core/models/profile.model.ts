/**
 * Profile models synchronized with backend/app/schemas/profile.py
 */

export interface CandidateProfile {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
}

export type ProfileResponse = CandidateProfile;
export type Profile = CandidateProfile;

export interface ProfileUpdate {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
}
