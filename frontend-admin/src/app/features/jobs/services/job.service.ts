import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Job,
  JobListResponse,
  JobCreate,
  JobUpdate,
  JobStatus,
  ApprovalRequest,
  RejectionRequest,
  Applicant,
  ApplicantDetail,
  ApplicantListResponse,
  Interview,
  InterviewCreateRequest,
  MatchDetailsResponse,
  ShortlistedListResponse,
  InterviewingListResponse,
  InterviewPassedListResponse,
  AiEvaluationResponse,
  CvJdCompareResponse,
  CalendarInterviewEvent,
} from '../models/job.model';

export interface JobListParams {
  page?: number;
  page_size?: number;
  status?: JobStatus;
  department?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  min_experience?: number;
  max_experience?: number;
  has_applications?: boolean;
  created_by?: number;
  search?: string;
  order_by?: string;
}

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private readonly baseUrl = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  list(params: JobListParams = {}): Observable<JobListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.page_size)
      httpParams = httpParams.set('page_size', params.page_size);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.department)
      httpParams = httpParams.set('department', params.department);
    if (params.location)
      httpParams = httpParams.set('location', params.location);
    if (params.employment_type)
      httpParams = httpParams.set('employment_type', params.employment_type);
    if (params.salary_min != null)
      httpParams = httpParams.set('salary_min', params.salary_min);
    if (params.salary_max != null)
      httpParams = httpParams.set('salary_max', params.salary_max);
    if (params.min_experience != null)
      httpParams = httpParams.set('min_experience', params.min_experience);
    if (params.max_experience != null)
      httpParams = httpParams.set('max_experience', params.max_experience);
    if (params.has_applications != null)
      httpParams = httpParams.set('has_applications', params.has_applications);
    if (params.created_by)
      httpParams = httpParams.set('created_by', params.created_by);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.order_by) httpParams = httpParams.set('order_by', params.order_by);

    return this.http.get<JobListResponse>(this.baseUrl, { params: httpParams });
  }

  get(id: number): Observable<Job> {
    return this.http.get<Job>(`${this.baseUrl}/${id}`);
  }

  create(data: JobCreate): Observable<Job> {
    return this.http.post<Job>(this.baseUrl, data);
  }

  update(id: number, data: JobUpdate): Observable<Job> {
    return this.http.put<Job>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  submit(id: number): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/${id}/submit`, {});
  }

  approve(id: number, request: ApprovalRequest = {}): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/${id}/approve`, request);
  }

  reject(id: number, request: RejectionRequest): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/${id}/reject`, request);
  }

  publish(id: number): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/${id}/publish`, {});
  }

  unpublish(id: number): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/${id}/unpublish`, {});
  }

  close(id: number): Observable<Job> {
    return this.http.post<Job>(`${this.baseUrl}/${id}/close`, {});
  }

  getApplications(
    jobId: number,
    params: { page?: number; size?: number; sort_by?: string; submitted_date?: string } = {}
  ): Observable<ApplicantListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.size) httpParams = httpParams.set('size', params.size);
    if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
    if (params.submitted_date) httpParams = httpParams.set('submitted_date', params.submitted_date);

    return this.http.get<ApplicantListResponse>(
      `${this.baseUrl}/${jobId}/applications`,
      { params: httpParams }
    );
  }

  getApplicationDetail(
    jobId: number,
    appId: number
  ): Observable<ApplicantDetail> {
    return this.http.get<ApplicantDetail>(
      `${this.baseUrl}/${jobId}/applications/${appId}`
    );
  }

  updateApplicationStatus(
    jobId: number,
    appId: number,
    status: string,
    reason?: string
  ): Observable<Applicant> {
    return this.http.patch<Applicant>(
      `${this.baseUrl}/${jobId}/applications/${appId}/status`,
      { status, reason }
    );
  }

  getResumeUrl(
    jobId: number,
    appId: number
  ): Observable<{ url: string; filename: string; content_type: string }> {
    return this.http.get<{ url: string; filename: string; content_type: string }>(
      `${this.baseUrl}/${jobId}/applications/${appId}/resume-url`
    );
  }

  downloadResume(jobId: number, appId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/${jobId}/applications/${appId}/resume-download`,
      { responseType: 'blob' }
    );
  }

  triggerScoring(jobId: number, appId: number): Observable<{
    id: number;
    application_id: number;
    total_score: number;
    skill_match_score: number;
    experience_score: number;
    education_score: number;
  }> {
    return this.http.post<{
      id: number;
      application_id: number;
      total_score: number;
      skill_match_score: number;
      experience_score: number;
      education_score: number;
    }>(`${this.baseUrl}/${jobId}/applications/${appId}/score`, {});
  }

  triggerScoreAll(jobId: number): Observable<{ message: string; count: number; scored: number }> {
    return this.http.post<{ message: string; count: number; scored: number }>(
      `${this.baseUrl}/${jobId}/score-all`,
      {}
    );
  }

  getMatchDetails(jobId: number, appId: number): Observable<MatchDetailsResponse> {
    return this.http.get<MatchDetailsResponse>(
      `${this.baseUrl}/${jobId}/applications/${appId}/match-details`
    );
  }

  // --- Shortlisted / AI Evaluation ---

  getShortlisted(
    params: { job_id?: number; page?: number; size?: number; sort_by?: string } = {}
  ): Observable<ShortlistedListResponse> {
    let httpParams = new HttpParams();
    if (params.job_id) httpParams = httpParams.set('job_id', params.job_id);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.size) httpParams = httpParams.set('size', params.size);
    if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);

    const url = `${environment.apiUrl}/shortlisted`;
    return this.http.get<ShortlistedListResponse>(url, { params: httpParams });
  }

  getCalendarInterviews(): Observable<CalendarInterviewEvent[]> {
    return this.http.get<CalendarInterviewEvent[]>(`${environment.apiUrl}/interviews/calendar`);
  }

  triggerAiEvaluation(
    jobId: number,
    appId: number
  ): Observable<{ message: string; application_id: number }> {
    return this.http.post<{ message: string; application_id: number }>(
      `${this.baseUrl}/${jobId}/applications/${appId}/ai-evaluate`,
      {}
    );
  }

  triggerAiEvaluateAll(jobId: number): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(
      `${this.baseUrl}/${jobId}/ai-evaluate-all`,
      {}
    );
  }

  getCvJdCompare(jobId: number, appId: number): Observable<CvJdCompareResponse> {
    return this.http.get<CvJdCompareResponse>(
      `${this.baseUrl}/${jobId}/applications/${appId}/cv-jd-compare`
    );
  }

  getAiEvaluation(
    jobId: number,
    appId: number
  ): Observable<AiEvaluationResponse> {
    return this.http.get<AiEvaluationResponse>(
      `${this.baseUrl}/${jobId}/applications/${appId}/ai-evaluation`
    );
  }

  getInterviewing(
    params: { page?: number; size?: number; sort_by?: string } = {}
  ): Observable<InterviewingListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.size) httpParams = httpParams.set('size', params.size);
    if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);

    const url = `${environment.apiUrl}/interviewing`;
    return this.http.get<InterviewingListResponse>(url, { params: httpParams });
  }

  getInterviewPassed(
    params: { page?: number; size?: number; status_filter?: string } = {}
  ): Observable<InterviewPassedListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.size) httpParams = httpParams.set('size', params.size);
    if (params.status_filter) httpParams = httpParams.set('status_filter', params.status_filter);

    const url = `${environment.apiUrl}/interview-passed`;
    return this.http.get<InterviewPassedListResponse>(url, { params: httpParams });
  }

  // --- Interview Scheduling & Live Evaluation ---

  getInterviewData(jobId: number, appId: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interview-data`
    );
  }

  saveInterviewQuestions(jobId: number, appId: number, questions: any[]): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interview-questions`,
      { questions }
    );
  }

  addCustomQuestion(jobId: number, appId: number, data: any): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interview-questions/add-custom`,
      data
    );
  }

  generateAiQuestions(jobId: number, appId: number, focusTopic: string = 'technical', count: number = 3): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interview-questions/generate-ai`,
      { focus_topic: focusTopic, count }
    );
  }

  transcribeInterviewAnswer(
    jobId: number,
    appId: number,
    interviewId: number,
    questionIndex: number,
    audioBlob: Blob
  ): Observable<any> {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, `recording_${questionIndex}.webm`);
    return this.http.post<any>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interviews/${interviewId}/questions/${questionIndex}/transcribe`,
      formData
    );
  }

  evaluateInterviewAnswer(
    jobId: number,
    appId: number,
    interviewId: number,
    questionIndex: number,
    audioBlob?: Blob,
    transcript?: string
  ): Observable<any> {
    const formData = new FormData();
    if (audioBlob) {
      formData.append('audio_file', audioBlob, `recording_${questionIndex}.webm`);
    }
    if (transcript) {
      formData.append('transcript', transcript);
    }
    return this.http.post<any>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interviews/${interviewId}/questions/${questionIndex}/evaluate-answer`,
      formData
    );
  }

  summarizeInterview(jobId: number, appId: number, interviewId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interviews/${interviewId}/summary`,
      {}
    );
  }

  scheduleInterview(jobId: number, appId: number, body: InterviewCreateRequest): Observable<Interview> {
    return this.http.post<Interview>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interviews`, body
    );
  }

  getInterviewAudioUrl(jobId: number, appId: number, interviewId: number, questionIndex: number): string {
    return `${this.baseUrl}/${jobId}/applications/${appId}/interviews/${interviewId}/questions/${questionIndex}/audio`;
  }

  getInterviews(jobId: number, appId: number): Observable<Interview[]> {
    return this.http.get<Interview[]>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interviews`
    );
  }

  updateInterview(jobId: number, appId: number, interviewId: number, body: Partial<Interview>): Observable<Interview> {
    return this.http.patch<Interview>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interviews/${interviewId}`, body
    );
  }

  cancelInterview(jobId: number, appId: number, interviewId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${jobId}/applications/${appId}/interviews/${interviewId}`
    );
  }

  parseJdFile(file: File): Observable<{ success: boolean; filename: string; data: any }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ success: boolean; filename: string; data: any }>(
      `${this.baseUrl}/parse-jd`,
      formData
    );
  }
}
