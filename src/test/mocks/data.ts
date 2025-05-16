import {
  PullRequestItem,
  PRAnalysisResult,
  AICodeFeedback,
} from "../../lib/types";

// Mock pull requests
export const mockPullRequests: PullRequestItem[] = [
  {
    id: 1,
    title: "PR 1: Add user authentication",
    number: 101,
    created_at: "2023-01-01",
    html_url: "https://github.com/org/repo/pull/101",
    state: "closed",
    closed_at: "2023-01-02",
    repository_url: "https://api.github.com/repos/org/repo",
  },
  {
    id: 2,
    title: "PR 2: Implement dashboard UI",
    number: 102,
    created_at: "2023-02-01",
    html_url: "https://github.com/org/repo/pull/102",
    state: "closed",
    closed_at: "2023-02-02",
    repository_url: "https://api.github.com/repos/org/repo",
  },
  {
    id: 3,
    title: "PR 3: Fix performance issues",
    number: 103,
    created_at: "2023-03-01",
    html_url: "https://github.com/org/repo/pull/103",
    state: "open",
    repository_url: "https://api.github.com/repos/org/repo",
  },
];

// Mock feedback for code analysis
export const mockCodeFeedback: AICodeFeedback = {
  strengths: [
    {
      text: "Good use of TypeScript interfaces",
      codeContext: {
        filePath: "src/types.ts",
        startLine: 1,
        endLine: 10,
        codeSnippet: "interface User { id: number; name: string; }",
      },
    },
    {
      text: "Clean component structure",
    },
  ],
  refinement_needs: [
    {
      text: "Consider adding error handling",
      codeContext: {
        filePath: "src/services/api.ts",
        startLine: 25,
        endLine: 30,
        codeSnippet: "const data = await fetch('/api/users');",
      },
    },
  ],
  learning_pathways: [
    {
      text: "Learn more about React hooks",
    },
  ],
  career_impact_summary:
    "Overall good code quality with room for improvement in error handling.",
  overall_quality: 7.5,
};

// Mock analysis results for PRs
export const mockAnalysisResults: PRAnalysisResult[] = [
  {
    prId: 1,
    prNumber: 101,
    prTitle: "PR 1: Add user authentication",
    prUrl: "https://github.com/org/repo/pull/101",
    feedback: { ...mockCodeFeedback, overall_quality: 8.2 },
  },
  {
    prId: 2,
    prNumber: 102,
    prTitle: "PR 2: Implement dashboard UI",
    prUrl: "https://github.com/org/repo/pull/102",
    feedback: { ...mockCodeFeedback, overall_quality: 6.8 },
  },
];
