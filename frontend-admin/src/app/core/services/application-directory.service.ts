import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { Applicant, ApplicantListResponse, Job } from '../../features/jobs/models/job.model';
import { JobService } from '../../features/jobs/services/job.service';

/** A recruiter-facing application enriched with the job it belongs to. */
export interface DirectoryApplication extends Applicant {
  jobId: number;
  jobTitle: string;
  department?: string;
}

/** A candidate can have more than one application, potentially for different jobs. */
export interface DirectoryCandidate {
  key: string;
  name: string;
  email: string;
  resumeFilename: string;
  applications: DirectoryApplication[];
  jobTitles: string[];
  latestApplication: DirectoryApplication;
  bestAiScore: number | null;
}

@Injectable({ providedIn: 'root' })
export class ApplicationDirectoryService {
  private readonly pageSize = 100;

  constructor(private readonly jobService: JobService) {}

  /** The current API exposes applications per job; this creates a read-only directory for HR. */
  getAllApplications(): Observable<DirectoryApplication[]> {
    return this.getJobsWithApplications().pipe(
      switchMap((jobs) => jobs.length ? forkJoin(jobs.map((job) => this.getApplicationsForJob(job))) : of([])),
      map((groups) => groups.flat().sort((a, b) => this.toTime(b.submitted_at) - this.toTime(a.submitted_at)))
    );
  }

  getAllCandidates(): Observable<DirectoryCandidate[]> {
    return this.getAllApplications().pipe(
      map((applications) => {
        const candidates = new Map<string, DirectoryApplication[]>();
        for (const application of applications) {
          const key = application.candidate_email.trim().toLowerCase() || `application-${application.id}`;
          candidates.set(key, [...(candidates.get(key) ?? []), application]);
        }
        return [...candidates.entries()].map(([key, candidateApplications]) => {
          const latestApplication = candidateApplications[0];
          const scores = candidateApplications.map((application) => application.ai_score)
            .filter((score): score is number => typeof score === 'number');
          return {
            key,
            name: latestApplication.candidate_name,
            email: latestApplication.candidate_email,
            resumeFilename: latestApplication.resume_filename,
            applications: candidateApplications,
            jobTitles: [...new Set(candidateApplications.map((application) => application.jobTitle))],
            latestApplication,
            bestAiScore: scores.length ? Math.max(...scores) : null,
          };
        }).sort((a, b) => this.toTime(b.latestApplication.submitted_at) - this.toTime(a.latestApplication.submitted_at));
      })
    );
  }

  private getJobsWithApplications(): Observable<Job[]> {
    return this.jobService.list({ page: 1, page_size: this.pageSize, has_applications: true }).pipe(
      switchMap((firstPage) => {
        const requests: Observable<{ items: Job[] }>[] = [of(firstPage)];
        for (let page = 2; page <= firstPage.pages; page += 1) {
          requests.push(this.jobService.list({ page, page_size: this.pageSize, has_applications: true }));
        }
        return forkJoin(requests).pipe(map((pages) => pages.flatMap((page) => page.items)));
      })
    );
  }

  private getApplicationsForJob(job: Job): Observable<DirectoryApplication[]> {
    return this.jobService.getApplications(job.id, { page: 1, size: this.pageSize }).pipe(
      switchMap((firstPage) => {
        const requests: Observable<ApplicantListResponse>[] = [of(firstPage)];
        for (let page = 2; page <= Math.ceil(firstPage.total / this.pageSize); page += 1) {
          requests.push(this.jobService.getApplications(job.id, { page, size: this.pageSize }));
        }
        return forkJoin(requests).pipe(map((pages) => pages.flatMap((page) => page.items.map((application) => ({
          ...application, jobId: job.id, jobTitle: job.title_vi, department: job.department,
        })) )));
      })
    );
  }

  private toTime(value: string | null | undefined): number { return value ? new Date(value).getTime() : 0; }
}
