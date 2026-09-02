import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile, ProfileUpdate } from '../../shared/models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private baseUrl = `${environment.publicApiUrl}/me`;

  constructor(private http: HttpClient) {}

  get(): Observable<Profile> {
    return this.http.get<Profile>(this.baseUrl);
  }

  update(data: ProfileUpdate): Observable<Profile> {
    return this.http.put<Profile>(this.baseUrl, data);
  }
}
