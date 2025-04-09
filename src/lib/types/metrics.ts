export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  commit?: any;
}

export interface PRMetrics {
  prId: number;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  commitCount?: number;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  commits?: Commit[];

  durationInDays?: number;
  commentCount?: number;
  changeRequestCount?: number;
}

export interface PRAnalysisResult {
  prId: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  score: number;
  summary: string;
}

export type PRMetricsCache = Record<number, PRMetrics>;
export type PRAnalysisCache = Record<number, PRAnalysisResult>;
