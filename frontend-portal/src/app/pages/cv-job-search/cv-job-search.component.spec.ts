import { CVJobMatchItem } from '../../shared/models/job.model';
import { sortJobMatchesByScore } from './cv-job-search.component';

describe('CVJobSearchComponent helpers', () => {
  it('sorts recommendations by match score descending without mutating input', () => {
    const jobs = [jobMatch(52, 1), jobMatch(91, 2), jobMatch(74, 3)];

    const sorted = sortJobMatchesByScore(jobs);

    expect(sorted.map((job) => job.total_score)).toEqual([91, 74, 52]);
    expect(jobs.map((job) => job.total_score)).toEqual([52, 91, 74]);
  });
});

function jobMatch(totalScore: number, id: number): CVJobMatchItem {
  return {
    id,
    slug: `job-${id}`,
    title_vi: `Công việc ${id}`,
    company_name: 'Công ty mẫu',
    department: null,
    location: null,
    employment_type: null,
    salary_min: null,
    salary_max: null,
    published_at: null,
    total_score: totalScore,
    skill_score: totalScore,
    experience_score: totalScore,
    education_score: totalScore,
    matched_skills: [],
    missing_skills: [],
  };
}
