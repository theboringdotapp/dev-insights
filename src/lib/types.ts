// GitHub user profile type
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

// Pull Request item
export interface PullRequestItem {
  id: number;
  html_url: string;
  title: string;
  state: string;
  created_at: string;
  closed_at?: string;
  number?: number;
  repository_url?: string;
}

// Pull Request metrics
export interface PullRequestMetrics {
  changeRequestCount: number;
  durationInDays: number;
  commentCount: number;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
}

// Developer statistics
export interface DeveloperStats {
  pullRequestCount: number;
  issueCount: number;
  reviewCount: number;
}

// Developer performance data
export interface DeveloperPerformanceData {
  pullRequests: unknown[];
  reviews: unknown[];
  stats: DeveloperStats | null;
  isLoading: boolean;
  error: string | null;
}
