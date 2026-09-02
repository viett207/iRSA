import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ApplicationDirectoryService, DirectoryCandidate } from '../../core/services/application-directory.service';
import { APPLICATION_STATUS_LABELS } from '../../features/jobs/models/job.model';

@Component({
  selector: 'app-candidates', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, NzButtonModule, NzEmptyModule, NzIconModule, NzInputModule, NzSkeletonModule, NzTableModule, NzToolTipModule],
  templateUrl: './candidates.component.html',
  styleUrl: './candidates.component.scss',
})
export class CandidatesComponent implements OnInit {
  private readonly directory = inject(ApplicationDirectoryService); private readonly destroyRef = inject(DestroyRef);
  readonly candidates = signal<DirectoryCandidate[]>([]); readonly loading = signal(true); readonly loadError = signal(false); readonly page = signal(1); readonly pageSize = 10; searchTerm = '';
  readonly filteredCandidates = computed(() => { const search = this.searchTerm.trim().toLowerCase(); return this.candidates().filter((candidate) => !search || [candidate.name, candidate.email, ...candidate.jobTitles].some((value) => value.toLowerCase().includes(search))); });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCandidates().length / this.pageSize)));
  readonly pagedCandidates = computed(() => this.filteredCandidates().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly evaluatedCount = computed(() => this.candidates().filter((candidate) => candidate.bestAiScore !== null).length);
  readonly multiApplicationCount = computed(() => this.candidates().filter((candidate) => candidate.applications.length > 1).length);
  ngOnInit(): void { this.load(); }
  load(): void { this.loading.set(true); this.loadError.set(false); this.directory.getAllCandidates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (candidates) => { this.candidates.set(candidates); this.loading.set(false); this.resetPage(); }, error: () => { this.loading.set(false); this.loadError.set(true); } }); }
  resetPage(): void { this.page.set(1); } previousPage(): void { this.page.update((page) => Math.max(1, page - 1)); } nextPage(): void { this.page.update((page) => Math.min(this.totalPages(), page + 1)); }
  initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'UV'; }
  statusLabel(status: string): string { return APPLICATION_STATUS_LABELS[status] ?? status; }
  statusTone(status: string): 'active' | 'pending' | 'disqualified' {
    if (status === 'rejected') return 'disqualified';
    if (status === 'submitted' || status === 'reviewing') return 'pending';
    return 'active';
  }
}
