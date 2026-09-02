import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { JobsComponent } from '../jobs.component';
import { JobsSectionBase } from './jobs-section.base';

@Component({
  selector: 'app-jobs-split-view',
  standalone: true,
  imports: [CommonModule, RouterModule, NzIconModule, NzSpinModule],
  templateUrl: './jobs-split-view.component.html',
  styleUrl: './jobs-split-view.component.scss',
})
export class JobsSplitViewComponent extends JobsSectionBase {
  @Input({ required: true }) override page!: JobsComponent;
}
