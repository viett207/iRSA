import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

import { PortalHeaderComponent } from '../../shared/components/portal-header/portal-header.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    NzLayoutModule,
    PortalHeaderComponent,
  ],
  template: `
    <nz-layout class="dashboard-layout">
      <app-portal-header></app-portal-header>

      <nz-content class="dashboard-content">
        <router-outlet></router-outlet>
      </nz-content>
    </nz-layout>
  `,
  styles: [`
    .dashboard-layout {
      min-height: 100vh;
    }

    .dashboard-content {
      background: var(--color-bg-primary);
      min-height: calc(100vh - var(--header-height));
      padding-top: var(--header-height);
    }
  `],
})
export class DashboardLayoutComponent {}
