import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { JobsComponent } from '../jobs.component';
import { JobsSectionBase } from './jobs-section.base';

@Component({
  selector: 'app-jobs-search-hero',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzAutocompleteModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
  ],
  templateUrl: './jobs-search-hero.component.html',
  styleUrl: './jobs-search-hero.component.scss',
})
export class JobsSearchHeroComponent extends JobsSectionBase {
  @Input({ required: true }) override page!: JobsComponent;
}
