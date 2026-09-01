/**
 * Resume models synchronized with backend/app/schemas/resume.py
 */

export interface Resume {
  id: number;
  original_filename: string;
  file_size: number;
  content_type: string;
  is_default: boolean;
  uploaded_at: string;
  download_url: string | null;
}

export type ResumeResponse = Resume;

export interface ResumeListResponse {
  items: Resume[];
  total: number;
}
