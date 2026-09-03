import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-summary',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzTagModule,
  ],
  templateUrl: './interview-summary.component.html',
  styleUrl: './interview-summary.component.scss',
})
export class InterviewSummaryComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;
}
