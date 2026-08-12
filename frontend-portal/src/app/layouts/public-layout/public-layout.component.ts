import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PortalHeaderComponent } from '../../shared/components/portal-header/portal-header.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzLayoutModule,
    NzIconModule,
    PortalHeaderComponent,
  ],
  template: `
    <nz-layout class="layout">
      <a class="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>

      <app-portal-header></app-portal-header>

      <nz-content id="main-content" class="content">
        <router-outlet></router-outlet>
      </nz-content>

      <nz-footer class="footer">
        <div class="footer-container">
          <div class="footer-main">
            <div class="footer-brand">
              <div class="footer-logo">
                <span nz-icon nzType="thunderbolt" nzTheme="fill"></span>
                <span>iRSA</span>
              </div>
              <p class="footer-tagline">
                Hệ thống tuyển dụng thông minh sử dụng AI
              </p>
            </div>

            <div class="footer-links">
              <div class="footer-column">
                <h4>Ứng viên</h4>
                <ul>
                  <li><a routerLink="/jobs">Tìm việc làm</a></li>
                  <li><a routerLink="/register">Tạo tài khoản</a></li>
                </ul>
              </div>
              <div class="footer-column">
                <h4>Nhà tuyển dụng</h4>
                <ul>
                  <li><a href="#">Đăng tin tuyển dụng</a></li>
                  <li><a href="#">Giải pháp HR</a></li>
                </ul>
              </div>
              <div class="footer-column">
                <h4>Liên hệ</h4>
                <ul>
                  <li>
                    <span nz-icon nzType="mail" nzTheme="outline"></span>
                    contact&#64;irsa.vn
                  </li>
                  <li>
                    <span nz-icon nzType="phone" nzTheme="outline"></span>
                    1900 xxxx
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <p>&copy; 2025 iRSA. Intelligent Resume Screening Automation. All rights reserved.</p>
          </div>
        </div>
      </nz-footer>
    </nz-layout>
  `,
  styles: [`
    .layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--color-primary);
      color: white;
      padding: 8px 16px;
      z-index: 9999;
      transition: top 0.2s;
      &:focus { top: 0; }
    }

    .content {
      flex: 1;
      min-height: calc(100vh - var(--header-height));
      padding-top: var(--header-height);
    }

    /* Footer */
    .footer {
      background: var(--color-bg-secondary) !important;
      border-top: 1px solid var(--color-border);
      padding: 0 !important;
    }

    .footer-container {
      max-width: var(--container-max);
      margin: 0 auto;
      padding: 0 var(--container-padding);
    }

    .footer-main {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: var(--space-12);
      padding: var(--space-12) 0;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: var(--space-8);
        padding: var(--space-8) 0;
      }
    }

    .footer-brand { max-width: 280px; }

    .footer-logo {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-family: var(--font-heading);
      font-size: var(--text-xl);
      font-weight: var(--font-extrabold);
      color: var(--color-primary);
      margin-bottom: var(--space-3);
      span:first-child { font-size: 24px; }
    }

    .footer-tagline {
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
      margin: 0;
    }

    .footer-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-8);
      @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); gap: var(--space-6); }
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }

    .footer-column {
      h4 {
        font-family: var(--font-heading);
        font-size: var(--text-sm);
        font-weight: var(--font-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      ul { list-style: none; padding: 0; margin: 0; }

      li {
        margin-bottom: var(--space-3);
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--color-text-secondary);
        font-size: var(--text-sm);

        a {
          color: var(--color-text-secondary);
          transition: color var(--transition-fast);
          &:hover { color: var(--color-primary); }
        }
      }
    }

    .footer-bottom {
      padding: var(--space-6) 0;
      border-top: 1px solid var(--color-border);
      text-align: center;
      p { margin: 0; color: var(--color-text-tertiary); font-size: var(--text-xs); }
    }
  `],
})
export class PublicLayoutComponent {}
