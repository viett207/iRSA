import type { JobsComponent } from '../jobs.component';

/**
 * Presentation-only adapter used by the Jobs page sections.
 *
 * JobsComponent remains the state/service coordinator while each child owns a
 * bounded template and stylesheet. Keeping these pass-throughs here preserves
 * the existing template expressions and avoids duplicating business state.
 */
export abstract class JobsSectionBase {
  abstract page: JobsComponent;

  get appliedJobIds() { return this.page.appliedJobIds; }
  get savedJobIds() { return this.page.savedJobIds; }

  get searchQuery() { return this.page.searchQuery; }
  set searchQuery(value) { this.page.searchQuery = value; }
  get isKeywordFocused() { return this.page.isKeywordFocused; }
  set isKeywordFocused(value) { this.page.isKeywordFocused = value; }
  get selectedLocation() { return this.page.selectedLocation; }
  set selectedLocation(value) { this.page.selectedLocation = value; }
  get selectedCategory() { return this.page.selectedCategory; }
  set selectedCategory(value) { this.page.selectedCategory = value; }
  get selectedSalaryPreset() { return this.page.selectedSalaryPreset; }
  set selectedSalaryPreset(value) { this.page.selectedSalaryPreset = value; }
  get companyCodeFilter() { return this.page.companyCodeFilter; }
  set companyCodeFilter(value) { this.page.companyCodeFilter = value; }
  get postedDateFilter() { return this.page.postedDateFilter; }
  set postedDateFilter(value) { this.page.postedDateFilter = value; }
  get onlySavedFilter() { return this.page.onlySavedFilter; }
  set onlySavedFilter(value) { this.page.onlySavedFilter = value; }
  get sortBy() { return this.page.sortBy; }
  set sortBy(value) { this.page.sortBy = value; }
  get salaryRange() { return this.page.salaryRange; }
  set salaryRange(value) { this.page.salaryRange = value; }
  get currentPage() { return this.page.currentPage; }
  set currentPage(value) { this.page.currentPage = value; }
  get pageSize() { return this.page.pageSize; }
  set pageSize(value) { this.page.pageSize = value; }

  get viewMode() { return this.page.viewMode; }
  set viewMode(value) { this.page.viewMode = value; }
  get selectedJobForPreview() { return this.page.selectedJobForPreview; }
  set selectedJobForPreview(value) { this.page.selectedJobForPreview = value; }
  get previewJobDetail() { return this.page.previewJobDetail; }
  get previewLoading() { return this.page.previewLoading; }

  get filterDrawerOpen() { return this.page.filterDrawerOpen; }
  set filterDrawerOpen(value) { this.page.filterDrawerOpen = value; }
  get quickPreviewDrawerOpen() { return this.page.quickPreviewDrawerOpen; }
  set quickPreviewDrawerOpen(value) { this.page.quickPreviewDrawerOpen = value; }
  get quickPreviewJob() { return this.page.quickPreviewJob; }

  get loading() { return this.page.loading; }
  get totalJobs() { return this.page.totalJobs; }
  get suggestions() { return this.page.suggestions; }
  get suggestionsLoading() { return this.page.suggestionsLoading; }
  get filteredCompanies() { return this.page.filteredCompanies; }
  get locations() { return this.page.locations; }
  get jobTypes() { return this.page.jobTypes; }
  get experienceLevels() { return this.page.experienceLevels; }
  get categories() { return this.page.categories; }
  get quickChips() { return this.page.quickChips; }
  get salaryPresets() { return this.page.salaryPresets; }
  get filteredJobs() { return this.page.filteredJobs; }
  get paginatedJobs() { return this.page.paginatedJobs; }

  toggleSaveJob(...args: Parameters<JobsComponent['toggleSaveJob']>) {
    return this.page.toggleSaveJob(...args);
  }
  onCompanySearch(...args: Parameters<JobsComponent['onCompanySearch']>) {
    return this.page.onCompanySearch(...args);
  }
  onSearchInput(...args: Parameters<JobsComponent['onSearchInput']>) {
    return this.page.onSearchInput(...args);
  }
  onSearch(...args: Parameters<JobsComponent['onSearch']>) {
    return this.page.onSearch(...args);
  }
  selectSuggestion(...args: Parameters<JobsComponent['selectSuggestion']>) {
    return this.page.selectSuggestion(...args);
  }
  onJobTypeChange(...args: Parameters<JobsComponent['onJobTypeChange']>) {
    return this.page.onJobTypeChange(...args);
  }
  onExperienceChange(...args: Parameters<JobsComponent['onExperienceChange']>) {
    return this.page.onExperienceChange(...args);
  }
  onSalaryPresetSelect(...args: Parameters<JobsComponent['onSalaryPresetSelect']>) {
    return this.page.onSalaryPresetSelect(...args);
  }
  toggleQuickChip(...args: Parameters<JobsComponent['toggleQuickChip']>) {
    return this.page.toggleQuickChip(...args);
  }
  setViewMode(...args: Parameters<JobsComponent['setViewMode']>) {
    return this.page.setViewMode(...args);
  }
  selectJobForLivePreview(...args: Parameters<JobsComponent['selectJobForLivePreview']>) {
    return this.page.selectJobForLivePreview(...args);
  }
  openQuickPreview(...args: Parameters<JobsComponent['openQuickPreview']>) {
    return this.page.openQuickPreview(...args);
  }
  copyJobLink(...args: Parameters<JobsComponent['copyJobLink']>) {
    return this.page.copyJobLink(...args);
  }
  onFilterChange(...args: Parameters<JobsComponent['onFilterChange']>) {
    return this.page.onFilterChange(...args);
  }
  onPageChange(...args: Parameters<JobsComponent['onPageChange']>) {
    return this.page.onPageChange(...args);
  }
  onPageSizeChange(...args: Parameters<JobsComponent['onPageSizeChange']>) {
    return this.page.onPageSizeChange(...args);
  }
  clearFilters(...args: Parameters<JobsComponent['clearFilters']>) {
    return this.page.clearFilters(...args);
  }
  applyFilters(...args: Parameters<JobsComponent['applyFilters']>) {
    return this.page.applyFilters(...args);
  }
  hasActiveFilters(...args: Parameters<JobsComponent['hasActiveFilters']>) {
    return this.page.hasActiveFilters(...args);
  }
  getActiveFiltersCount(...args: Parameters<JobsComponent['getActiveFiltersCount']>) {
    return this.page.getActiveFiltersCount(...args);
  }
  getActiveFilters(...args: Parameters<JobsComponent['getActiveFilters']>) {
    return this.page.getActiveFilters(...args);
  }
  removeFilter(...args: Parameters<JobsComponent['removeFilter']>) {
    return this.page.removeFilter(...args);
  }
  navigateToJob(...args: Parameters<JobsComponent['navigateToJob']>) {
    return this.page.navigateToJob(...args);
  }
}
