import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, NzResultModule, NzButtonModule, RouterModule],
  template: `
    <div class="page-container">
      <nz-result
        nzStatus="info"
        nzTitle="Cài đặt"
        nzSubTitle="Tính năng cài đặt đang được phát triển"
      >
        <div nz-result-extra>
          <button nz-button nzType="primary" routerLink="/dashboard">
            Quay lại Dashboard
          </button>
        </div>
      </nz-result>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }
  `],
})
export class SettingsComponent {}
