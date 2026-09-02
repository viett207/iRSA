import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DailyCount {
  date: string;
  count: number;
}

export interface JobRanking {
  job_id: number;
  title: string;
  department: string | null;
  application_count: number;
  avg_score: number | null;
}

export interface DepartmentStat {
  department: string;
  job_count: number;
  application_count: number;
  avg_score: number | null;
}

export interface ScoreBucket {
  range: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface ReportsOverview {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  scored_applications: number;
  avg_score: number | null;
  hired_count: number;
  completed_interviews?: number;
  passed_interviews?: number;
  interview_pass_rate?: number | null;
  ai_screening_time_saved_hours?: number | null;
  application_trend: DailyCount[];
  score_distribution: ScoreBucket[];
  application_by_status: StatusCount[];
  job_by_status: StatusCount[];
  top_jobs: JobRanking[];
  department_stats: DepartmentStat[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getOverview(days: number = 30): Observable<ReportsOverview> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ReportsOverview>(`${this.baseUrl}/overview`, { params });
  }
}
