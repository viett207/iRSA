import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSliderModule } from 'ng-zorro-antd/slider';

import type { JobsComponent } from '../jobs.component';
import { JobsSectionBase } from './jobs-section.base';

@Component({
  selector: 'app-jobs-filter-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzDividerModule,
    NzIconModule,
    NzSelectModule,
    NzSliderModule,
  ],
  templateUrl: './jobs-filter-panel.component.html',
  styleUrl: './jobs-filter-panel.component.scss',
})
export class JobsFilterPanelComponent extends JobsSectionBase {
  @Input({ required: true }) override page!: JobsComponent;
}
