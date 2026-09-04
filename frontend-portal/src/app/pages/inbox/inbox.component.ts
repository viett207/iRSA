import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import {
  ChatService,
  ConversationItem,
  MessageResponse,
} from '../../core/services/chat.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { SoundService } from '../../core/services/sound.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    NzEmptyModule,
    NzModalModule,
    NzTagModule,
    NzBadgeModule,
    NzToolTipModule,
  ],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  private chatService = inject(ChatService);
  private notifService = inject(NotificationService);
  private soundService = inject(SoundService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private route = inject(ActivatedRoute);

  conversations = signal<ConversationItem[]>([]);
  selectedConversation = signal<ConversationItem | null>(null);
  messages = signal<MessageResponse[]>([]);
  
  loadingConversations = signal<boolean>(false);
  loadingMessages = signal<boolean>(false);
  sending = signal<boolean>(false);
  responding = signal<boolean>(false);

  newMessageText = '';
  searchQuery = '';
  conversationFilter: 'all' | 'unread' | 'interview' = 'all';
  detailsOpen = typeof window === 'undefined' || window.innerWidth > 1180;

  private sub = new Subscription();

  ngOnInit(): void {
    this.loadConversations();

    // 1. Listen to real-time chat messages via WebSocket for instant push
    this.sub.add(
      this.notifService.chatMessages$.subscribe((data) => {
        if (!data || !data.message) return;
        const msg: MessageResponse = data.message;
        const appId = data.application_id || msg.application_id;

        // Auto-refresh conversation list
        this.loadConversations(true);

        // If currently viewing this conversation, reload messages
        const current = this.selectedConversation();
        if (current && current.application_id === appId) {
          this.loadMessages(appId, true);
        }
      })
    );

    // 2. Listen to route query param changes to select target conversation
    this.sub.add(
      this.route.queryParamMap.subscribe((params) => {
        const appIdParam = params.get('appId');
        if (appIdParam && this.conversations().length > 0) {
          const target = this.conversations().find((c) => c.application_id === Number(appIdParam));
          if (target && this.selectedConversation()?.application_id !== target.application_id) {
            this.selectConversation(target);
          }
        }
      })
    );

    // 3. Auto-refresh ONLY while on this Inbox page (polls every 3.5s silently)
    // When navigating away from Inbox, ngOnDestroy automatically cancels this interval!
    this.sub.add(
      interval(3500).subscribe(() => {
        this.loadConversations(true);
        const current = this.selectedConversation();
        if (current) {
          this.loadMessages(current.application_id, true);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadConversations(silent: boolean = false): void {
    if (!silent) {
      this.loadingConversations.set(true);
    }
    this.chatService.getConversations().subscribe({
      next: (items) => {
        this.conversations.set(items);
        if (!silent) {
          this.loadingConversations.set(false);
        }

        // Keep current selected conversation in sync with latest metadata
        const current = this.selectedConversation();
        if (current) {
          const fresh = items.find((c) => c.application_id === current.application_id);
          if (fresh) {
            this.selectedConversation.set(fresh);
          }
        }

        // Check if query param specified an application_id
        const appIdParam = this.route.snapshot.queryParamMap.get('appId');
        if (appIdParam) {
          const target = items.find((c) => c.application_id === Number(appIdParam));
          if (target && (!current || current.application_id !== target.application_id)) {
            this.selectConversation(target);
            return;
          }
        }

        // Auto-select first conversation if available and none currently selected
        if (items.length > 0 && !this.selectedConversation()) {
          this.selectConversation(items[0]);
        }
      },
      error: () => {
        if (!silent) {
          this.loadingConversations.set(false);
        }
      },
    });
  }

  selectConversation(conv: ConversationItem): void {
    this.selectedConversation.set(conv);
    this.loadMessages(conv.application_id);

    if (conv.unread_count > 0) {
      conv.unread_count = 0;
      this.chatService.markAsRead(conv.application_id).subscribe();
    }
  }

  loadMessages(applicationId: number, silent: boolean = false): void {
    if (!silent) {
      this.loadingMessages.set(true);
    }
    this.chatService.getMessages(applicationId).subscribe({
      next: (msgs) => {
        const prevCount = this.messages().length;
        const newCount = msgs.length;

        // In silent mode, if new messages arrived from HR, play chime and mark read
        if (silent && newCount > prevCount) {
          const newMessages = msgs.slice(prevCount);
          if (newMessages.some((m) => m.sender_role !== 'candidate')) {
            this.soundService.playMessageSound();
            this.chatService.markAsRead(applicationId).subscribe();
          }
        }

        this.messages.set(msgs);
        if (!silent) {
          this.loadingMessages.set(false);
        }

        // Scroll to bottom on initial load or when new messages arrived
        if (!silent || newCount > prevCount) {
          this.scrollToBottom();
        }
      },
      error: () => {
        if (!silent) {
          this.loadingMessages.set(false);
        }
      },
    });
  }

  sendMessage(): void {
    const text = this.newMessageText.trim();
    const conv = this.selectedConversation();
    if (!text || !conv || this.sending()) return;

    this.sending.set(true);
    this.chatService.sendMessage(conv.application_id, text).subscribe({
      next: (msg) => {
        // Optimistically add if not already added by WS
        const exists = this.messages().some((m) => m.id === msg.id);
        if (!exists) {
          this.messages.update((prev) => [...prev, msg]);
          this.scrollToBottom();
        }
        this.newMessageText = '';
        this.sending.set(false);
      },
      error: () => {
        this.message.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
        this.sending.set(false);
      },
    });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    this.sendMessage();
  }

  confirmInterview(invitationId?: number): void {
    if (!invitationId || this.responding()) return;
    this.responding.set(true);
    this.chatService.respondToInvitation(invitationId, 'accepted').subscribe({
      next: () => {
        this.message.success('Đã xác nhận tham gia buổi phỏng vấn!');
        this.responding.set(false);
        this.markCurrentInvitationStatus('accepted');
      },
      error: (err) => {
        this.message.error(err.error?.detail || 'Không thể xác nhận');
        this.responding.set(false);
      },
    });
  }

  declineInterview(invitationId?: number): void {
    if (!invitationId || this.responding()) return;

    let declineNote = '';
    this.modal.confirm({
      nzTitle: 'Từ chối lịch phỏng vấn',
      nzContent: 'Bạn có chắc chắn muốn từ chối buổi phỏng vấn này không? Bạn có thể gửi kèm lý do nếu muốn.',
      nzOkText: 'Xác nhận từ chối',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.responding.set(true);
        this.chatService.respondToInvitation(invitationId, 'declined', declineNote).subscribe({
          next: () => {
            this.message.info('Đã gửi phản hồi từ chối lịch phỏng vấn');
            this.responding.set(false);
            this.markCurrentInvitationStatus('declined');
          },
          error: (err) => {
            this.message.error(err.error?.detail || 'Không thể gửi phản hồi');
            this.responding.set(false);
          },
        });
      },
    });
  }

  private markCurrentInvitationStatus(status: 'accepted' | 'declined'): void {
    const conv = this.selectedConversation();
    if (conv) {
      conv.candidate_response = status;
      if (status === 'declined') {
        conv.interview_status = 'cancelled';
      }
    }
    // Update invitation message cards in thread
    this.messages.update((list) =>
      list.map((m) => {
        if (m.message_type === 'interview_invitation' && m.metadata_json) {
          return {
            ...m,
            metadata_json: {
              ...m.metadata_json,
              candidate_response: status,
              status: status === 'declined' ? 'cancelled' : m.metadata_json.status,
            },
          };
        }
        return m;
      })
    );
  }

  private updateConversationInterviewState(appId: number, msg: MessageResponse): void {
    const meta = msg.metadata_json;
    if (!meta) return;
    this.conversations.update((list) =>
      list.map((c) => {
        if (c.application_id === appId) {
          return {
            ...c,
            candidate_response: meta.candidate_response || meta.response || c.candidate_response,
            interview_status: meta.status || c.interview_status,
          };
        }
        return c;
      })
    );
  }

  private updateConversationListWithNewMessage(appId: number, msg: MessageResponse): void {
    this.conversations.update((list) => {
      const target = list.find((c) => c.application_id === appId);
      if (!target) return list;

      const current = this.selectedConversation();
      const isCurrent = current?.application_id === appId;

      return list.map((c) => {
        if (c.application_id === appId) {
          return {
            ...c,
            latest_message: msg,
            unread_count: isCurrent ? 0 : c.unread_count + 1,
          };
        }
        return c;
      });
    });
  }

  get filteredConversations(): ConversationItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.conversations().filter((c) => {
      const matchesQuery =
        !q ||
        c.job_title.toLowerCase().includes(q) ||
        (c.company_name && c.company_name.toLowerCase().includes(q));
      const matchesFilter =
        this.conversationFilter === 'all' ||
        (this.conversationFilter === 'unread' && c.unread_count > 0) ||
        (this.conversationFilter === 'interview' && !!c.interview_date);
      return matchesQuery && matchesFilter;
    });
  }

  setConversationFilter(filter: 'all' | 'unread' | 'interview'): void {
    this.conversationFilter = filter;
  }

  useQuickReply(text: string): void {
    this.newMessageText = text;
  }

  toggleDetails(): void {
    this.detailsOpen = !this.detailsOpen;
  }

  getApplicationStage(conv: ConversationItem): number {
    if (conv.candidate_response === 'accepted') return 3;
    if (conv.interview_date || conv.interview_status) return 2;
    return 1;
  }

  getInterviewStatusLabel(conv: ConversationItem): string {
    if (conv.candidate_response === 'accepted') return 'Đã xác nhận';
    if (conv.candidate_response === 'declined' || conv.interview_status === 'cancelled') {
      return 'Đã hủy';
    }
    if (conv.interview_date) return 'Chờ phản hồi';
    return 'Chưa có lịch';
  }

  isFirstMessageInGroup(index: number, message: MessageResponse): boolean {
    if (message.message_type !== 'text' || index === 0) return true;
    const previous = this.messages()[index - 1];
    return (
      previous.message_type !== 'text' ||
      previous.sender_role !== message.sender_role ||
      previous.sender_id !== message.sender_id
    );
  }

  isLastMessageInGroup(index: number, message: MessageResponse): boolean {
    if (message.message_type !== 'text' || index === this.messages().length - 1) return true;
    const next = this.messages()[index + 1];
    return (
      next.message_type !== 'text' ||
      next.sender_role !== message.sender_role ||
      next.sender_id !== message.sender_id
    );
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  getCandidateInitials(name?: string): string {
    if (!name) return 'HR';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'HR';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
}
