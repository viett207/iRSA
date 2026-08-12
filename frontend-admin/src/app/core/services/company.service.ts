import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Company,
  CompanyListParams,
  CompanyListResponse,
  CompanyCreate,
  CompanyUpdate,
} from '../../pages/companies/models/company-api.model';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private readonly baseUrl = `${environment.apiUrl}/companies`;

  constructor(private http: HttpClient) {}

  list(params: CompanyListParams = {}): Observable<CompanyListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.page_size) httpParams = httpParams.set('page_size', params.page_size);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.industry) httpParams = httpParams.set('industry', params.industry);
    if (params.location) httpParams = httpParams.set('location', params.location);

    return this.http.get<CompanyListResponse>(this.baseUrl, { params: httpParams });
  }

  get(id: number): Observable<Company> {
    return this.http.get<Company>(`${this.baseUrl}/${id}`);
  }

  create(data: CompanyCreate): Observable<Company> {
    return this.http.post<Company>(this.baseUrl, data);
  }

  update(id: number, data: CompanyUpdate): Observable<Company> {
    return this.http.put<Company>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
