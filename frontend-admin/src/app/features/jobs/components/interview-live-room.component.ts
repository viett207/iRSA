import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-live-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzRadioModule,
  ],
  templateUrl: './interview-live-room.component.html',
  styleUrl: './interview-live-room.component.scss',
})
export class InterviewLiveRoomComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;

  readonly selectedQuestionIndex = signal(0);
  readonly currentQuestion = computed(() => {
    const questions = this.activeQuestions();
    return questions[this.selectedQuestionIndex()] ?? questions[0] ?? null;
  });

  selectQuestion(index: number): void {
    if (index < 0 || index >= this.activeQuestions().length) return;
    this.selectedQuestionIndex.set(index);
  }

  moveQuestion(offset: number): void {
    this.selectQuestion(this.selectedQuestionIndex() + offset);
  }

  getQuestionStateLabel(questionState: any): string {
    if (this.hasAnswerEvaluation(questionState)) return `Đã chấm · ${questionState.answer.score}/100`;
    if (questionState?.recording) return 'Đang ghi âm';
    if (questionState?.transcript?.trim()) return 'Có nội dung trả lời';
    if (questionState?.audioBlob || questionState?.localAudioUrl || questionState?.rawAudioUrl || questionState?.audioUrl) {
      return 'Đã có bản ghi';
    }
    return 'Chưa thực hiện';
  }

  getQuestionState(questionState: any): 'done' | 'active' | 'recorded' | 'pending' {
    if (this.hasAnswerEvaluation(questionState)) return 'done';
    if (questionState?.recording) return 'active';
    if (questionState?.transcript?.trim() || questionState?.audioBlob || questionState?.localAudioUrl || questionState?.rawAudioUrl || questionState?.audioUrl) {
      return 'recorded';
    }
    return 'pending';
  }
}
