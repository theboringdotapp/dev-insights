import {
  PullRequestItem,
  CommitItem,
  PullRequestMetrics,
  PRAnalysisResult,
} from "../../lib/types";
import { mockCodeFeedback } from "./data";

// Helper function to create commits
const createCommits = (count: number): CommitItem[] => {
  return Array.from({ length: count }).map((_, index) => ({
    sha: `sha${index + 1}`,
    url: `https://github.com/org/repo/commit/sha${index + 1}`,
    html_url: `https://github.com/org/repo/commit/sha${index + 1}`,
    commit: {
      message: `Commit message ${index + 1}`,
      url: `https://github.com/org/repo/commit/sha${index + 1}`,
    },
  }));
};

// Helper to create PRs for a specific month
const createPRsForMonth = (
  month: number,
  year: number,
  count: number,
  startId: number = 1
): PullRequestItem[] => {
  return Array.from({ length: count }).map((_, index) => {
    const id = startId + index;
    const day = Math.min(28, index + 1);
    const date = new Date(year, month, day);

    return {
      id,
      number: id * 100,
      title: `PR ${id}: Feature for month ${month + 1}/${year}`,
      created_at: date.toISOString(),
      html_url: `https://github.com/org/repo/pull/${id * 100}`,
      state: "closed",
      closed_at: new Date(date.getTime() + 86400000 * 3).toISOString(), // 3 days later
      repository_url: "https://api.github.com/repos/org/repo",
    };
  });
};

// PRs by month - single PR per month
export const singlePRPerMonth: PullRequestItem[] = [
  // January with 1 PR
  ...createPRsForMonth(0, 2023, 1, 1),
  // March with 1 PR
  ...createPRsForMonth(2, 2023, 1, 2),
  // June with 1 PR
  ...createPRsForMonth(5, 2023, 1, 3),
];

// PRs by month - multiple PRs per month
export const multiplePRsPerMonth: PullRequestItem[] = [
  // January with 3 PRs
  ...createPRsForMonth(0, 2023, 3, 4),
  // February with 2 PRs
  ...createPRsForMonth(1, 2023, 2, 7),
  // April with 4 PRs
  ...createPRsForMonth(3, 2023, 4, 9),
];

// Combination of months with single and multiple PRs
export const mixedPRsPerMonth: PullRequestItem[] = [
  // January with 1 PR
  ...createPRsForMonth(0, 2023, 1, 13),
  // March with 3 PRs
  ...createPRsForMonth(2, 2023, 3, 14),
  // May with 1 PR
  ...createPRsForMonth(4, 2023, 1, 17),
  // August with 2 PRs
  ...createPRsForMonth(7, 2023, 2, 18),
];

// Mock metrics with different commit counts
export const mockPRMetricsMap: Record<number, PullRequestMetrics> = {
  // PR with single commit
  1: {
    changeRequestCount: 0,
    durationInDays: 3,
    commentCount: 2,
    commits: createCommits(1),
    isLoaded: true,
    isLoading: false,
  },
  // PR with multiple commits
  2: {
    changeRequestCount: 2,
    durationInDays: 5,
    commentCount: 8,
    commits: createCommits(7),
    isLoaded: true,
    isLoading: false,
  },
  // PR with error loading metrics
  3: {
    changeRequestCount: 0,
    durationInDays: 0,
    commentCount: 0,
    commits: [],
    isLoaded: false,
    isLoading: false,
    error: "Failed to load metrics",
  },
  // Add more as needed for other PRs
  4: {
    changeRequestCount: 1,
    durationInDays: 2,
    commentCount: 3,
    commits: createCommits(2),
    isLoaded: true,
    isLoading: false,
  },
  7: {
    changeRequestCount: 0,
    durationInDays: 1,
    commentCount: 0,
    commits: createCommits(3),
    isLoaded: true,
    isLoading: false,
  },
  9: {
    changeRequestCount: 3,
    durationInDays: 7,
    commentCount: 12,
    commits: createCommits(15),
    isLoaded: true,
    isLoading: false,
  },
};

// Mock analyses for PRs
export const mockPRAnalysisMap: Record<number, PRAnalysisResult> = {
  // PR with analysis
  1: {
    prId: 1,
    prNumber: 100,
    prTitle: "PR 1: Feature for month 1/2023",
    prUrl: "https://github.com/org/repo/pull/100",
    feedback: { ...mockCodeFeedback, overall_quality: 8.5 },
  },
  // Another PR with analysis
  4: {
    prId: 4,
    prNumber: 400,
    prTitle: "PR 4: Feature for month 1/2023",
    prUrl: "https://github.com/org/repo/pull/400",
    feedback: { ...mockCodeFeedback, overall_quality: 6.2 },
  },
  // PR with lower score
  7: {
    prId: 7,
    prNumber: 700,
    prTitle: "PR 7: Feature for month 2/2023",
    prUrl: "https://github.com/org/repo/pull/700",
    feedback: { ...mockCodeFeedback, overall_quality: 4.8 },
  },
};

// Sets of analyzed PR IDs for different scenarios
export const analyzedPRIds = new Set([1, 4, 7]);
export const analyzingPRIds = new Set([9]);
