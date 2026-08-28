import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PublicJob,
  PublicJobListResponse,
  JobSearchParams,
  ActiveCompanyListResponse,
  CompanyDetail,
  CVJobSearchResponse,
} from '../../shared/models/job.model';
import { Application } from '../../shared/models/application.model';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private baseUrl = `${environment.publicApiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  list(params: JobSearchParams = {}): Observable<PublicJobListResponse> {
    let httpParams = new HttpParams();

    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.location) httpParams = httpParams.set('location', params.location);
    if (params.department) httpParams = httpParams.set('department', params.department);
    if (params.employment_type)
      httpParams = httpParams.set('employment_type', params.employment_type);
    if (params.salary_min != null)
      httpParams = httpParams.set('salary_min', params.salary_min.toString());
    if (params.salary_max != null)
      httpParams = httpParams.set('salary_max', params.salary_max.toString());
    if (params.min_experience != null)
      httpParams = httpParams.set('min_experience', params.min_experience.toString());
    if (params.max_experience != null)
      httpParams = httpParams.set('max_experience', params.max_experience.toString());
    if (params.company_code)
      httpParams = httpParams.set('company_code', params.company_code);
    if (params.order_by)
      httpParams = httpParams.set('order_by', params.order_by);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.size) httpParams = httpParams.set('size', params.size.toString());

    return this.http.get<PublicJobListResponse>(this.baseUrl, { params: httpParams });
  }

  getBySlug(slug: string): Observable<PublicJob> {
    return this.http.get<PublicJob>(`${this.baseUrl}/${slug}`);
  }

  apply(slug: string, formData: FormData): Observable<Application> {
    return this.http.post<Application>(`${this.baseUrl}/${slug}/apply`, formData);
  }

  listActiveCompanies(limit = 20): Observable<ActiveCompanyListResponse> {
    return this.http.get<ActiveCompanyListResponse>(
      `${this.baseUrl}/active-companies`,
      { params: { limit: limit.toString() } },
    );
  }

  getCompanyDetail(companyCode: string): Observable<CompanyDetail> {
    return this.http.get<CompanyDetail>(`${this.baseUrl}/companies/${companyCode}`);
  }

  searchByCV(params: {
    resume_id?: number;
    file?: File;
    page?: number;
    size?: number;
  }): Observable<CVJobSearchResponse> {
    const formData = new FormData();
    // Always include resume_id (even as empty string) to avoid empty multipart body
    formData.append('resume_id', params.resume_id != null ? params.resume_id.toString() : '');
    if (params.file) formData.append('file', params.file);

    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.size) httpParams = httpParams.set('size', params.size.toString());

    return this.http.post<CVJobSearchResponse>(
      `${this.baseUrl}/search-by-cv`,
      formData,
      { params: httpParams },
    );
  }

  searchByCVWithProgress(params: {
    resume_id?: number;
    file?: File;
    page?: number;
    size?: number;
  }): Observable<HttpEvent<CVJobSearchResponse>> {
    const formData = new FormData();
    formData.append('resume_id', params.resume_id != null ? params.resume_id.toString() : '');
    if (params.file) formData.append('file', params.file);

    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.size) httpParams = httpParams.set('size', params.size.toString());

    return this.http.post<CVJobSearchResponse>(
      `${this.baseUrl}/search-by-cv`,
      formData,
      {
        params: httpParams,
        observe: 'events',
        reportProgress: true,
      },
    );
  }
}
