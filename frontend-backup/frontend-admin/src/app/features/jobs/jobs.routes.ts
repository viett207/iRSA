import { Routes } from '@angular/router';
import { JobListComponent } from './pages/job-list/job-list.component';
import { JobFormComponent } from './pages/job-form/job-form.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { ShortlistedComponent } from './pages/shortlisted/shortlisted.component';
import { InterviewingComponent } from './pages/interviewing/interviewing.component';
import { InterviewPassedComponent } from './pages/interview-passed/interview-passed.component';

export const JOB_ROUTES: Routes = [
  { path: '', component: JobListComponent },
  { path: 'shortlisted', component: ShortlistedComponent },
  { path: 'interviewing', component: InterviewingComponent },
  { path: 'interview-passed', component: InterviewPassedComponent },
  { path: 'new', component: JobFormComponent },
  { path: ':id', component: JobDetailComponent },
  { path: ':id/edit', component: JobFormComponent },
];
