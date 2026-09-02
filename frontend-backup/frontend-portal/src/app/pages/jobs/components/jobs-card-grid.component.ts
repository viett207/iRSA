import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import type { JobsComponent } from '../jobs.component';
import { JobsSectionBase } from './jobs-section.base';

@Component({
  selector: 'app-jobs-card-grid',
  standalone: true,
  imports: [CommonModule, RouterModule, NzIconModule, NzToolTipModule],
  templateUrl: './jobs-card-grid.component.html',
  styleUrl: './jobs-card-grid.component.scss',
})
export class JobsCardGridComponent extends JobsSectionBase {
  @Input({ required: true }) override page!: JobsComponent;
}
