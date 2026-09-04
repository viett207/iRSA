import { Injectable, signal } from '@angular/core';
import { CandidateConversation } from '../../features/jobs/services/job.service';

@Injectable({ providedIn: 'root' })
export class ChatDockService {
  readonly openChats = signal<CandidateConversation[]>([]);
  readonly minimizedChats = signal<CandidateConversation[]>([]);

  openChat(conversation: CandidateConversation): void {
    // Un-minimize if this conversation was minimized
    this.minimizedChats.update((items) =>
      items.filter((item) => item.application_id !== conversation.application_id)
    );

    const current = this.openChats();
    const existingIndex = current.findIndex(
      (item) => item.application_id === conversation.application_id
    );

    if (existingIndex !== -1) {
      // If already open, merge any refreshed conversation metadata
      const updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...conversation };
      this.openChats.set(updated);
      return;
    }

    // Limit maximum open windows to 3; push oldest to minimized rail
    if (current.length >= 3) {
      this.addMinimizedChat(current[0]);
    }

    this.openChats.set([
      ...current.slice(Math.max(0, current.length - 2)),
      conversation,
    ]);
  }

  closeChat(applicationId: number): void {
    this.openChats.update((items) =>
      items.filter((item) => item.application_id !== applicationId)
    );
    this.minimizedChats.update((items) =>
      items.filter((item) => item.application_id !== applicationId)
    );
  }

  closeAllChats(): void {
    this.openChats.set([]);
    this.minimizedChats.set([]);
  }

  minimizeChat(conversation: CandidateConversation): void {
    this.openChats.update((items) =>
      items.filter((item) => item.application_id !== conversation.application_id)
    );
    this.addMinimizedChat(conversation);
  }

  restoreChat(conversation: CandidateConversation): void {
    this.openChat(conversation);
  }

  removeChats(applicationIds: number[] | Set<number>): void {
    const idSet = applicationIds instanceof Set ? applicationIds : new Set(applicationIds);
    this.openChats.update((items) =>
      items.filter((item) => !idSet.has(item.application_id))
    );
    this.minimizedChats.update((items) =>
      items.filter((item) => !idSet.has(item.application_id))
    );
  }

  incrementMinimizedUnread(applicationId: number): void {
    this.minimizedChats.update((items) =>
      items.map((item) =>
        item.application_id === applicationId
          ? { ...item, unread_count: (item.unread_count || 0) + 1 }
          : item
      )
    );
  }

  private addMinimizedChat(conversation: CandidateConversation): void {
    this.minimizedChats.update((items) =>
      items.some((item) => item.application_id === conversation.application_id)
        ? items
        : [...items, conversation]
    );
  }
}
