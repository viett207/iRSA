import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import type { JobsComponent } from '../jobs.component';
import { JobsSectionBase } from './jobs-section.base';

@Component({
  selector: 'app-jobs-results-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzTagModule,
    NzToolTipModule,
  ],
  templateUrl: './jobs-results-toolbar.component.html',
  styleUrl: './jobs-results-toolbar.component.scss',
})
export class JobsResultsToolbarComponent extends JobsSectionBase {
  @Input({ required: true }) override page!: JobsComponent;
}
