import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'companies/:code',
        loadComponent: () =>
          import('./pages/company-detail/company-detail.component').then(
            (m) => m.CompanyDetailComponent
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
      },
      {
        path: 'jobs/:slug',
        loadComponent: () =>
          import('./pages/job-detail/job-detail.component').then(
            (m) => m.JobDetailComponent
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login/login.component').then((m) => m.LoginComponent),
        canActivate: [guestGuard],
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/register/register.component').then(
            (m) => m.RegisterComponent
          ),
        canActivate: [guestGuard],
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./pages/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent
          ),
      },
      {
        path: 'resend-verification',
        loadComponent: () =>
          import(
            './pages/resend-verification/resend-verification.component'
          ).then((m) => m.ResendVerificationComponent),
      },
      {
        path: 'email-required',
        loadComponent: () =>
          import('./pages/email-required/email-required.component').then(
            (m) => m.EmailRequiredComponent
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent
          ),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./pages/forbidden/forbidden.component').then(
            (m) => m.ForbiddenComponent
          ),
      },
      {
        path: '403',
        loadComponent: () =>
          import('./pages/forbidden/forbidden.component').then(
            (m) => m.ForbiddenComponent
          ),
      },
      {
        path: '404',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./pages/dashboard/applications/applications.component').then(
            (m) => m.ApplicationsComponent
          ),
      },
      {
        path: 'interview-invitations',
        loadComponent: () =>
          import(
            './pages/dashboard/interview-invitations/interview-invitations.component'
          ).then((m) => m.InterviewInvitationsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/dashboard/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'cv-search',
        loadComponent: () =>
          import('./pages/cv-job-search/cv-job-search.component').then(
            (m) => m.CVJobSearchComponent
          ),
      },
    ],
  },
  {
    path: '**',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent
          ),
      },
    ],
  },
];
