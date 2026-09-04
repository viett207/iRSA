import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MessageResponse {
  id: number;
  application_id: number;
  sender_id?: number;
  sender_role: 'hr' | 'candidate' | 'system';
  sender_name?: string;
  content: string;
  message_type: 'text' | 'interview_invitation' | 'interview_response';
  metadata_json?: {
    interview_id?: number;
    interview_date?: string;
    interview_type?: 'online' | 'offline';
    location?: string;
    notes?: string;
    status?: string;
    candidate_response?: 'pending' | 'accepted' | 'declined' | 'reschedule_requested';
    candidate_response_note?: string;
    response?: string;
    note?: string;
    proposed_date?: string;
  };
  is_read: boolean;
  created_at: string;
}

export interface ConversationItem {
  application_id: number;
  job_id: number;
  job_title: string;
  candidate_id: number;
  candidate_name: string;
  candidate_email?: string;
  company_name?: string;
  latest_message?: MessageResponse;
  unread_count: number;
  interview_id?: number;
  interview_status?: string;
  candidate_response?: string;
  interview_date?: string;
  interview_type?: string;
  location?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private pubBase = environment.publicApiUrl;

  /** Total unread messages across conversations */
  readonly unreadCount = signal(0);

  loadUnreadCount(): void {
    this.getConversations().subscribe();
  }

  getConversations(): Observable<ConversationItem[]> {
    return this.http.get<ConversationItem[]>(`${this.pubBase}/inbox/conversations`).pipe(
      tap((items) => {
        if (Array.isArray(items)) {
          const total = items.reduce((acc, c) => acc + (c.unread_count || 0), 0);
          this.unreadCount.set(total);
        }
      })
    );
  }

  getMessages(applicationId: number): Observable<MessageResponse[]> {
    return this.http.get<MessageResponse[]>(`${this.pubBase}/inbox/applications/${applicationId}/messages`);
  }

  sendMessage(applicationId: number, content: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.pubBase}/inbox/applications/${applicationId}/messages`, { content });
  }

  markAsRead(applicationId: number): Observable<any> {
    return this.http.patch(`${this.pubBase}/inbox/applications/${applicationId}/read`, {}).pipe(
      tap(() => {
        this.loadUnreadCount();
      })
    );
  }

  respondToInvitation(
    interviewId: number,
    response: 'accepted' | 'declined' | 'reschedule_requested',
    note?: string,
  ): Observable<any> {
    return this.http.patch(`${this.pubBase}/applications/interview-invitations/${interviewId}/response`, {
      response,
      note: note || null,
    });
  }
}
