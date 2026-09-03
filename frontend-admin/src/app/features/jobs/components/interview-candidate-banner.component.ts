import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-candidate-banner',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  templateUrl: './interview-candidate-banner.component.html',
  styleUrl: './interview-candidate-banner.component.scss',
})
export class InterviewCandidateBannerComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;

  getInitials(name: string): string {
    return name.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toUpperCase()).join('');
  }
}
