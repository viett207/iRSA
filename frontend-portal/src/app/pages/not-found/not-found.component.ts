import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, NzButtonModule, NzIconModule],
  template: `
    <div class="error-page">
      <div class="error-card">
        <!-- Visual SVG Illustration -->
        <div class="illustration-wrapper">
          <div class="ambient-glow"></div>
          <svg class="illustration-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Floating Circles -->
            <circle cx="28" cy="36" r="14" fill="var(--color-primary)" fill-opacity="0.12" class="float-slow" />
            <circle cx="174" cy="48" r="10" fill="var(--color-warning)" fill-opacity="0.18" class="float-fast" />
            <circle cx="158" cy="128" r="18" fill="var(--color-success)" fill-opacity="0.1" class="float-slow" />
            
            <!-- Ground Line -->
            <path d="M20 142H180" stroke="var(--color-border)" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 6"/>
            
            <!-- Document Shape -->
            <rect x="62" y="24" width="76" height="104" rx="10" fill="var(--color-bg-secondary)" stroke="var(--color-primary)" stroke-width="2.5"/>
            <rect x="76" y="44" width="48" height="6" rx="3" fill="var(--color-border)"/>
            <rect x="76" y="58" width="36" height="6" rx="3" fill="var(--color-border)"/>
            <rect x="76" y="72" width="44" height="6" rx="3" fill="var(--color-border)"/>
            
            <!-- Magnifying Glass Search -->
            <g class="search-glass">
              <circle cx="120" cy="98" r="26" fill="var(--color-bg-primary)" stroke="var(--color-primary)" stroke-width="4"/>
              <line x1="138" y1="116" x2="160" y2="138" stroke="var(--color-primary)" stroke-width="5" stroke-linecap="round"/>
              <path d="M110 92C110 86.4772 114.477 82 120 82" stroke="var(--color-primary-light, #60a5fa)" stroke-width="2.5" stroke-linecap="round"/>
              <!-- Question mark in glass -->
              <text x="120" y="106" text-anchor="middle" font-family="var(--font-heading)" font-size="22" font-weight="bold" fill="var(--color-primary)">?</text>
            </g>
          </svg>
        </div>

        <div class="status-code">404</div>
        <h1 class="error-title">Không tìm thấy trang yêu cầu</h1>
        <p class="error-desc">
          Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang đường dẫn khác.
        </p>

        <!-- Quick Links -->
        <div class="quick-links">
          <span class="links-title">Gợi ý tìm nhanh:</span>
          <div class="links-group">
            <a routerLink="/jobs" class="quick-tag">
              <span nz-icon nzType="search" nzTheme="outline"></span>
              <span>Tìm việc làm</span>
            </a>
            <a routerLink="/dashboard/cv-search" class="quick-tag">
              <span nz-icon nzType="thunderbolt" nzTheme="outline"></span>
              <span>Tìm việc bằng CV</span>
            </a>
            <a routerLink="/dashboard" class="quick-tag">
              <span nz-icon nzType="dashboard" nzTheme="outline"></span>
              <span>Quản lý ứng tuyển</span>
            </a>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="error-actions">
          <button
            nz-button
            nzType="primary"
            nzSize="large"
            class="action-btn-primary"
            routerLink="/"
          >
            <span nz-icon nzType="home" nzTheme="outline"></span>
            <span>Quay lại trang chủ</span>
          </button>

          <button
            nz-button
            nzSize="large"
            class="action-btn-default"
            (click)="goBack()"
          >
            <span nz-icon nzType="arrow-left" nzTheme="outline"></span>
            <span>Quay lại trang trước đó</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .error-page {
        min-height: calc(100vh - 160px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-8) var(--space-4);
        background-color: var(--color-bg-primary);
      }

      .error-card {
        background: var(--color-bg-secondary);
        border-radius: var(--radius-2xl);
        box-shadow: var(--shadow-2xl);
        border: 1px solid var(--color-border);
        padding: 48px 36px;
        width: 100%;
        max-width: 540px;
        text-align: center;
        position: relative;
        overflow: hidden;

        @media (max-width: 576px) {
          padding: 32px 20px;
        }
      }

      .illustration-wrapper {
        width: 100%;
        max-width: 220px;
        height: 160px;
        margin: 0 auto 12px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ambient-glow {
        position: absolute;
        width: 160px;
        height: 120px;
        border-radius: 50%;
        background: var(--color-primary);
        opacity: 0.08;
        filter: blur(28px);
        pointer-events: none;
      }

      .illustration-svg {
        width: 100%;
        height: 100%;
      }

      .float-slow {
        animation: float 3.5s ease-in-out infinite;
      }

      .float-fast {
        animation: float 2.4s ease-in-out infinite reverse;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }

      .search-glass {
        animation: glass-pulse 3s ease-in-out infinite;
        transform-origin: 120px 98px;
      }

      @keyframes glass-pulse {
        0%, 100% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.05) rotate(-3deg); }
      }

      .status-code {
        font-family: var(--font-heading);
        font-size: var(--text-5xl);
        font-weight: var(--font-extrabold);
        color: var(--color-primary);
        line-height: 1;
        margin-bottom: 8px;
        letter-spacing: 3px;
      }

      .error-title {
        font-family: var(--font-heading);
        font-size: var(--text-2xl);
        font-weight: var(--font-bold);
        color: var(--color-text-primary);
        margin-bottom: 12px;
      }

      .error-desc {
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        line-height: var(--leading-relaxed);
        margin-bottom: 24px;
      }

      .quick-links {
        background: var(--color-bg-tertiary, #f8fafc);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 12px 14px;
        margin-bottom: 24px;
        text-align: left;
      }

      .links-title {
        display: block;
        font-size: var(--text-xs);
        color: var(--color-text-tertiary);
        font-weight: var(--font-medium);
        margin-bottom: 8px;
      }

      .links-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .quick-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: var(--text-xs);
        color: var(--color-text-primary);
        font-weight: var(--font-medium);
        transition: all var(--transition-fast);

        &:hover {
          color: var(--color-primary);
          border-color: var(--color-primary);
          background: var(--color-primary-50, #eff6ff);
        }
      }

      .error-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .action-btn-primary {
        height: 48px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-semibold) !important;
        font-size: var(--text-base) !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .action-btn-default {
        height: 44px !important;
        border-radius: var(--radius-lg) !important;
        font-weight: var(--font-medium) !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
    `,
  ],
})
export class NotFoundComponent {
  private readonly location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
