import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { JobsComponent } from './pages/jobs/jobs.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ApplicationsComponent } from './pages/dashboard/applications/applications.component';
import { ProfileComponent } from './pages/dashboard/profile/profile.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { ResendVerificationComponent } from './pages/resend-verification/resend-verification.component';
import { EmailRequiredComponent } from './pages/email-required/email-required.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { CVJobSearchComponent } from './pages/cv-job-search/cv-job-search.component';
import { CompaniesComponent } from './pages/companies/companies.component';
import { CompanyDetailComponent } from './pages/company-detail/company-detail.component';
import { InboxComponent } from './pages/inbox/inbox.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'companies', component: CompaniesComponent },
      { path: 'companies/:code', component: CompanyDetailComponent },
      { path: 'jobs', component: JobsComponent },
      { path: 'jobs/:slug', component: JobDetailComponent },
      { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
      { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
      { path: 'verify-email', component: VerifyEmailComponent },
      { path: 'resend-verification', component: ResendVerificationComponent },
      { path: 'email-required', component: EmailRequiredComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
      { path: 'inbox', component: InboxComponent, canActivate: [authGuard] },
    ],
  },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'applications', component: ApplicationsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'cv-search', component: CVJobSearchComponent },
      { path: 'inbox', component: InboxComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
