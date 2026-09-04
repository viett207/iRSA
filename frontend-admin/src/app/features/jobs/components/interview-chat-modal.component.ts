import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { JobService } from '../services/job.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-interview-chat-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    NzEmptyModule,
    NzTagModule,
  ],
  templateUrl: './interview-chat-modal.component.html',
  styleUrl: './interview-chat-modal.component.scss',
})
export class InterviewChatModalComponent implements OnInit, OnDestroy {
  @Input() appId!: number;
  @Input() candidateName = '';
  @Input() jobTitle = '';
  @Input() candidateResponse?: string = 'pending';
  @Input() interviewDate?: string;
  @Input() dockMode = false;
  @Output() chatClosed = new EventEmitter<void>();
  @Output() chatMinimized = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  private jobService = inject(JobService);
  private notifService = inject(NotificationService);
  private message = inject(NzMessageService);
  public modalRef = inject(NzModalRef, { optional: true });

  messages = signal<any[]>([]);
  loading = signal<boolean>(false);
  sending = signal<boolean>(false);
  newMessageText = '';

  private sub = new Subscription();

  ngOnInit(): void {
    this.loadMessages();

    // Listen to real-time incoming messages via WebSocket
    this.sub.add(
      this.notifService.chatMessages$.subscribe((data) => {
        if (!data || !data.message) return;
        const msg = data.message;
        const appId = data.application_id || msg.application_id;
        if (appId === this.appId) {
          const exists = this.messages().some((m) => m.id === msg.id);
          if (!exists) {
            this.messages.update((prev) => [...prev, msg]);
            this.scrollToBottom();
            this.jobService.markMessagesRead(this.appId).subscribe();
          }

          if (msg.message_type === 'interview_response' && msg.metadata_json) {
            this.candidateResponse = msg.metadata_json.response;
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  closeChat(): void {
    if (this.dockMode) this.chatClosed.emit();
    else this.modalRef?.close();
  }

  minimizeChat(): void {
    this.chatMinimized.emit();
  }

  loadMessages(): void {
    this.loading.set(true);
    this.jobService.getApplicationMessages(this.appId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loading.set(false);
        this.scrollToBottom();
        this.jobService.markMessagesRead(this.appId).subscribe();

        // Check if there is latest candidate response in messages
        const latestResp = [...msgs]
          .reverse()
          .find((m) => m.message_type === 'interview_response' || m.message_type === 'interview_invitation');
        if (latestResp && latestResp.metadata_json) {
          this.candidateResponse =
            latestResp.metadata_json.candidate_response ||
            latestResp.metadata_json.response ||
            this.candidateResponse;
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  sendMessage(): void {
    const text = this.newMessageText.trim();
    if (!text || this.sending()) return;

    this.sending.set(true);
    this.jobService.sendApplicationMessage(this.appId, text).subscribe({
      next: (msg) => {
        const exists = this.messages().some((m) => m.id === msg.id);
        if (!exists) {
          this.messages.update((prev) => [...prev, msg]);
          this.scrollToBottom();
        }
        this.newMessageText = '';
        this.sending.set(false);
      },
      error: () => {
        this.message.error('Không thể gửi tin nhắn.');
        this.sending.set(false);
      },
    });
  }

  onComposerEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.sendMessage();
  }

  showDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const current = this.messages()[index]?.created_at;
    const previous = this.messages()[index - 1]?.created_at;
    if (!current || !previous) return false;
    return new Date(current).toDateString() !== new Date(previous).toDateString();
  }

  getDateLabel(value: string): string {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(date);
  }

  isMessageContinuation(index: number): boolean {
    if (index <= 0) return false;
    const current = this.messages()[index];
    const previous = this.messages()[index - 1];
    if (!this.isRegularMessage(current) || !this.isRegularMessage(previous)) return false;
    if (current.sender_role !== previous.sender_role) return false;
    const elapsed = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
    return elapsed >= 0 && elapsed <= 5 * 60 * 1000;
  }

  isLastMessageInGroup(index: number): boolean {
    const next = this.messages()[index + 1];
    const current = this.messages()[index];
    if (!next || !this.isRegularMessage(current) || !this.isRegularMessage(next)) return true;
    if (current.sender_role !== next.sender_role) return true;
    const elapsed = new Date(next.created_at).getTime() - new Date(current.created_at).getTime();
    return elapsed < 0 || elapsed > 5 * 60 * 1000;
  }

  private isRegularMessage(message: any): boolean {
    return !!message && !['interview_invitation', 'interview_response'].includes(message.message_type);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  getCandidateInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'UV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
}
