import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-candidate-banner',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzProgressModule, NzTagModule],
  templateUrl: './interview-candidate-banner.component.html',
  styleUrl: './interview-candidate-banner.component.scss',
})
export class InterviewCandidateBannerComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;
}
