import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-question-dialogs',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzModalModule, NzSelectModule],
  templateUrl: './interview-question-dialogs.component.html',
  styleUrl: './interview-question-dialogs.component.scss',
})
export class InterviewQuestionDialogsComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;
}
