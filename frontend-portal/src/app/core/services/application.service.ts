import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Application, ApplicationListResponse } from '../../shared/models/application.model';

@Injectable({
  providedIn: 'root',
})
export class ApplicationService {
  private baseUrl = `${environment.publicApiUrl}/applications`;

  constructor(private http: HttpClient) {}

  list(page: number = 1, size: number = 20): Observable<ApplicationListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApplicationListResponse>(this.baseUrl, { params });
  }

  get(id: number): Observable<Application> {
    return this.http.get<Application>(`${this.baseUrl}/${id}`);
  }

  getAppliedJobIds(): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/applied-job-ids`);
  }

  downloadResume(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/resume`, {
      responseType: 'blob',
    });
  }
}
