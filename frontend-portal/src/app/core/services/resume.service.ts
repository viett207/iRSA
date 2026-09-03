import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Resume, ResumeListResponse } from '../../shared/models/resume.model';

@Injectable({
  providedIn: 'root',
})
export class ResumeService {
  private baseUrl = `${environment.publicApiUrl}/me/resumes`;

  constructor(private http: HttpClient) {}

  list(): Observable<ResumeListResponse> {
    return this.http.get<ResumeListResponse>(this.baseUrl);
  }

  upload(file: File): Observable<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Resume>(this.baseUrl, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  setDefault(id: number): Observable<Resume> {
    return this.http.post<Resume>(`${this.baseUrl}/${id}/default`, {});
  }

  download(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/file`, { responseType: 'blob' });
  }
}
