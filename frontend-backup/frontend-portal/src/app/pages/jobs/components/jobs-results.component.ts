import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import type { JobsComponent } from '../jobs.component';
import { JobsCardGridComponent } from './jobs-card-grid.component';
import { JobsSectionBase } from './jobs-section.base';
import { JobsSplitViewComponent } from './jobs-split-view.component';

@Component({
  selector: 'app-jobs-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzPaginationModule,
    JobsCardGridComponent,
    JobsSplitViewComponent,
  ],
  templateUrl: './jobs-results.component.html',
  styleUrl: './jobs-results.component.scss',
})
export class JobsResultsComponent extends JobsSectionBase {
  @Input({ required: true }) override page!: JobsComponent;
}
