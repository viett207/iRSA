/**
 * AI Evaluation models synchronized with src/models/schemas.py and backend/app/api/v1/scoring.py
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'unknown';
export type AiEducationLevel = 'high_school' | 'bachelor' | 'master' | 'phd' | 'unknown';
export type InterviewQuestionCategory = 'technical' | 'behavioral' | 'experience';
export type AiRecommendation = 'STRONG_FIT' | 'GOOD_FIT' | 'PARTIAL_FIT' | 'WEAK_FIT' | 'NOT_FIT';

export interface SkillAssessment {
  skill: string;
  found: boolean;
  confidence: number;
  evidence: string;
  level: SkillLevel;
}

export interface ExperienceAssessment {
  detected_years: number;
  relevant_years: number;
  confidence: number;
  summary: string;
}

export interface EducationAssessment {
  detected_level: AiEducationLevel;
  field_relevant: boolean;
  summary: string;
}

export interface InterviewQuestion {
  question: string;
  category: InterviewQuestionCategory;
  target_skill: string | null;
  purpose: string;
}

export interface AiEvaluation {
  overall_score: number;
  overall_assessment: string;
  recommendation: AiRecommendation;
  skill_assessments: SkillAssessment[];
  experience_assessment: ExperienceAssessment;
  education_assessment: EducationAssessment;
  strengths: string[];
  concerns: string[];
  interview_questions: InterviewQuestion[];
}

export type AiEvaluationOutput = AiEvaluation;

export interface AiEvaluationResponse {
  application_id: number;
  ai_score: number | null;
  ai_evaluation: AiEvaluation | null;
  ai_evaluated_at: string | null;
  has_evaluation: boolean;
}

export interface AgentEvaluationRequest {
  application_id: number;
  force_reevaluate?: boolean;
}

export interface AgentEvaluationResponse {
  application_id: number;
  candidate_name: string;
  job_title: string;
  overall_score: number;
  recommendation: string;
  evaluation_result: AiEvaluation;
  email_notification_sent: boolean;
  evaluated_at: string;
}
