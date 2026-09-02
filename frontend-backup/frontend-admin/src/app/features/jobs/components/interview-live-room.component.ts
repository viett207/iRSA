import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { InterviewRoomSectionBase } from './interview-room-section.base';
import type { InterviewRoomModalComponent } from './interview-room-modal.component';

@Component({
  selector: 'app-interview-live-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzProgressModule,
    NzRadioModule,
    NzTagModule,
  ],
  templateUrl: './interview-live-room.component.html',
  styleUrl: './interview-live-room.component.scss',
})
export class InterviewLiveRoomComponent extends InterviewRoomSectionBase {
  @Input({ required: true }) override room!: InterviewRoomModalComponent;
}
