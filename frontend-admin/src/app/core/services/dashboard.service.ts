import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  stats: {
    active_jobs: number;
    total_applications: number;
    total_candidates: number;
    pending_applications?: number;
    avg_time_to_fill?: number | null;
    jobs_trend?: number | null;
    apps_trend?: number | null;
    time_trend?: number | null;
  };
  application_status_counts: Record<string, number>;
  job_status_counts: Record<string, number>;
  recent_applications: RecentApplication[];
  pending_approvals: PendingApproval[];
}

export interface RecentApplication {
  id: number;
  job_id: number;
  candidate_name: string;
  job_title: string;
  department?: string | null;
  employment_type?: string | null;
  submitted_at: string | null;
  status: string;
}

export interface PendingApproval {
  id: number;
  title: string;
  creator: string;
  created_at: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/stats`);
  }
}
