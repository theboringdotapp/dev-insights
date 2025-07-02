// GitHub user profile type
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

// AI interfaces
export interface GenerateOptions {
  prompt: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

export interface AI {
  generate(options: GenerateOptions): Promise<string>;
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

// PR Review states from GitHub API
export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';

// Individual PR review details
export interface PullRequestReview {
  id: number;
  user: {
    login: string;
  };
  state: ReviewState;
  body: string | null;
  submitted_at: string;
  pull_request_url: string;
}

// Review metrics for a single PR
export interface ReviewMetrics {
  prNumber: number;
  prUrl: string;
  repository: string;
  userReviews: PullRequestReview[];
  latestReviewState: ReviewState | null;
  totalReviews: number;
  hasApproved: boolean;
  hasRequestedChanges: boolean;
}

// Developer review statistics
export interface DeveloperReviewStats {
  totalPRsReviewed: number;
  prsApproved: number;
  prsWithChangesRequested: number;
  prsCommentedOnly: number;
  approvalRate: number; // percentage of PRs where latest review was APPROVED
  changeRequestRate: number; // percentage of PRs where user requested changes
}

// Developer statistics
export interface DeveloperStats {
  pullRequestCount: number;
  commitCount: number;
  reviewCount: number;
  reviewStats?: DeveloperReviewStats;
}

// Developer performance data
export interface DeveloperPerformanceData {
  pullRequests: unknown[];
  reviews: unknown[];
  reviewMetrics: ReviewMetrics[];
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
  refinement_needs: FeedbackItem[];
  learning_pathways: FeedbackItem[];
  career_impact_summary: string;
  overall_quality?: number;

  // Legacy field names for backward compatibility
  areas_for_improvement?: FeedbackItem[];
  growth_opportunities?: FeedbackItem[];
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

// Meta Analysis Types
export interface RecurringPattern {
  category: "strength" | "refinement" | "learning";
  pattern_name: string;
  description: string;
  frequency: string;
  impact: string;
}

export interface FocusArea {
  area: string;
  why: string;
  resources: string;
}

interface DevelopmentTrajectory {
  current_level: string;
  next_milestone: string;
  key_actions: string[];
}

interface ManagerialInsights {
  strengths_to_leverage: string;
  growth_support: string;
  project_recommendations: string;
}

export interface MetaAnalysisResult {
  recurring_patterns: RecurringPattern[];
  recommended_focus_areas: FocusArea[];
  development_trajectory: DevelopmentTrajectory;
  managerial_insights: ManagerialInsights;
}
