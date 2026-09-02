import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';
import {
  UserListParams,
  UserListResponse,
  UserCreate,
  UserUpdate,
} from '../../pages/users/models/user-api.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  list(params: UserListParams = {}): Observable<UserListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.page_size) httpParams = httpParams.set('page_size', params.page_size);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.is_active !== undefined) httpParams = httpParams.set('is_active', params.is_active);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<UserListResponse>(this.baseUrl, { params: httpParams });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  create(data: UserCreate): Observable<User> {
    return this.http.post<User>(this.baseUrl, data);
  }

  update(id: number, data: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listPendingApprovals(params: { page?: number; page_size?: number } = {}): Observable<UserListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.page_size) httpParams = httpParams.set('page_size', params.page_size);
    return this.http.get<UserListResponse>(`${this.baseUrl}/pending-approvals`, { params: httpParams });
  }

  approveUser(id: number): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/${id}/approve`, {});
  }

  rejectUser(id: number): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/${id}/reject`, {});
  }
}
