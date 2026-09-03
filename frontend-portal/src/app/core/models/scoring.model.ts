/**
 * ScoringResult and MatchDetails models synchronized with backend/app/api/v1/scoring.py and backend/app/models/scoring_result.py
 */

export interface SkillMatchBreakdown {
  matched: string[];
  missing: string[];
  score: number;
}

export interface ExperienceMatchBreakdown {
  detected_years: number;
  required_min: number;
  required_max: number | null;
  score: number;
}

export interface EducationMatchBreakdown {
  detected_level: string;
  required_level: string | null;
  score: number;
}

export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
}

export interface MatchDetails {
  must_have_skills?: SkillMatchBreakdown;
  nice_to_have_skills?: SkillMatchBreakdown;
  experience?: ExperienceMatchBreakdown;
  education?: EducationMatchBreakdown;
  weights?: ScoringWeights;
  [key: string]: unknown;
}

export interface ScoringResult {
  id: number;
  application_id: number;
  total_score: number;
  skill_match_score: number;
  experience_score: number;
  education_score: number;
  match_details: MatchDetails;
  ai_score?: number | null;
  ai_evaluation?: Record<string, unknown> | null;
  ai_evaluated_at?: string | null;
  scored_at: string;
  scoring_version?: string;
}

export type ScoringResultResponse = ScoringResult;

export interface ScoreTriggeredResponse {
  message: string;
  application_id: number;
}
