import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-question-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzTagModule,
    NzToolTipModule,
  ],
  templateUrl: './interview-question-setup.component.html',
  styleUrl: './interview-question-setup.component.scss',
})
export class InterviewQuestionSetupComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;
}
