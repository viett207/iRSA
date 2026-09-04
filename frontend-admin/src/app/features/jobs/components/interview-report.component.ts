import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interview-report.component.html',
  styleUrl: './interview-report.component.scss',
})
export class InterviewReportComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;

  jumpToQuestion(index: number): void {
    document.getElementById(`report-question-${index}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  formatInterviewDate(value?: string | null): string {
    if (!value) return 'Chưa ghi nhận';
    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  getCandidateInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(-2).map((part) => part[0]).join('').toUpperCase() || 'UV';
  }
}
