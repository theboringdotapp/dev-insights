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

// Commit item
export interface CommitItem {
  sha: string;
  url: string;
  html_url?: string;
  commit: {
    message: string;
    url: string;
  };
}

// Pull Request metrics
export interface PullRequestMetrics {
  changeRequestCount: number;
  durationInDays: number;
  commentCount: number;
  commits: CommitItem[];
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
}

// Developer statistics
export interface DeveloperStats {
  pullRequestCount: number;
  commitCount: number;
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

// New interface for individual feedback items with code context
export interface CodeContext {
  filePath: string;
  startLine: number;
  endLine: number;
  codeSnippet: string;
}

export interface FeedbackItem {
  text: string;
  codeContext?: CodeContext;
}

// AI Code Analysis types
export interface AICodeFeedback {
  strengths: FeedbackItem[];
  areas_for_improvement: FeedbackItem[];
  growth_opportunities: FeedbackItem[];
  career_impact_summary: string;
  overall_quality?: number;
}

export interface PRAnalysisResult {
  prId: number;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  feedback: AICodeFeedback;
  error?: string;
}

// Detail for a specific instance of feedback within a PR
export interface FeedbackInstance {
  prId: number;
  prUrl: string;
  prTitle: string;
  codeContext?: CodeContext; // Code context might not exist for general feedback
}

export interface FeedbackFrequency {
  text: string;
  count: number;
  instances: FeedbackInstance[]; // Changed from prIds, prUrls, prTitles
}

export interface AggregatedFeedback {
  commonStrengths: FeedbackFrequency[];
  commonWeaknesses: FeedbackFrequency[];
  commonSuggestions: FeedbackFrequency[];
  careerDevelopmentSummary: string;
  averageScore: number;
}
