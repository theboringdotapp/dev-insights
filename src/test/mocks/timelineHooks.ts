import { vi } from "vitest";
import { PullRequestItem, PullRequestMetrics } from "../../lib/types";
import {
  mockPRMetricsMap,
  mockPRAnalysisMap,
  analyzedPRIds,
  analyzingPRIds,
} from "./timelineData";

// Mock usePRMetrics hook
export const createMockPRMetricsHook = (
  customMetrics?: Record<number, PullRequestMetrics>
) => {
  const metrics = customMetrics || mockPRMetricsMap;
  return {
    metricsCache: metrics,
    getPRMetrics: vi.fn((pr: PullRequestItem) => metrics[pr.id]),
    loadPRMetrics: vi.fn((pr: PullRequestItem) =>
      Promise.resolve(metrics[pr.id])
    ),
    getAnalysisFromMemoryCache: vi.fn(
      (prId: number) => mockPRAnalysisMap[prId] || null
    ),
    getAnalysisForPR: vi.fn((prId: number) =>
      Promise.resolve(mockPRAnalysisMap[prId] || null)
    ),
    analyzeAdditionalPR: vi.fn((pr: PullRequestItem) =>
      Promise.resolve(mockPRAnalysisMap[pr.id] || null)
    ),
  };
};

// Mock useRepositoryColors hook
export const createMockRepositoryColorsHook = () => {
  const repoColors = {
    "org/repo": "bg-blue-500",
    "org/other-repo": "bg-purple-500",
    "other-org/repo": "bg-green-500",
  };

  return {
    repoColors,
    getRepoName: vi.fn((url: string) => {
      const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      return match ? match[1] : "org/repo";
    }),
  };
};

// Mock usePRAnalysis hook
export const createMockPRAnalysisHook = (
  customAnalyzedIds?: Set<number>,
  customAnalyzingIds?: Set<number>
) => {
  const analyzedIds = customAnalyzedIds || analyzedPRIds;
  const analyzingIds = customAnalyzingIds || analyzingPRIds;

  return {
    isPRAnalyzed: vi.fn((prId: number) => analyzedIds.has(prId)),
    isAnalyzingPR: vi.fn((prId: number) => analyzingIds.has(prId)),
    handleAnalyzePR: vi.fn((pr: PullRequestItem) =>
      Promise.resolve(mockPRAnalysisMap[pr.id] || null)
    ),
    handleReanalyzePR: vi.fn((pr: PullRequestItem) =>
      Promise.resolve(mockPRAnalysisMap[pr.id] || null)
    ),
  };
};

// Mock usePRGroups hook
export const createMockPRGroupsHook = (pullRequests: PullRequestItem[]) => {
  // Group pull requests by month and year
  const groupedPRs: Record<string, PullRequestItem[]> = {};
  const months: string[] = [];

  pullRequests.forEach((pr) => {
    const date = new Date(pr.created_at);
    const monthYear = `${date.toLocaleString("default", {
      month: "long",
    })} ${date.getFullYear()}`;

    if (!groupedPRs[monthYear]) {
      groupedPRs[monthYear] = [];
      months.push(monthYear);
    }

    groupedPRs[monthYear].push(pr);
  });

  // Sort months chronologically (most recent first)
  const sortedMonths = months.sort((a, b) => {
    const [monthA, yearA] = a.split(" ");
    const [monthB, yearB] = b.split(" ");

    const dateA = new Date(`${monthA} 1, ${yearA}`);
    const dateB = new Date(`${monthB} 1, ${yearB}`);

    return dateB.getTime() - dateA.getTime();
  });

  return {
    groupedPRs,
    sortedMonths,
  };
};

// Mock useTimeframeInfo hook
export const createMockTimeframeInfoHook = (hittingLimit: boolean = false) => {
  return {
    maxItems: 50,
    isLikelyHittingLimit: hittingLimit,
  };
};

// Mock useAPIConfiguration hook
export const createMockAPIConfigurationHook = (hasApiKey: boolean = true) => {
  return {
    apiKey: hasApiKey ? "test-api-key" : "",
    setApiKey: vi.fn(),
    apiProvider: "openai",
    setApiProvider: vi.fn(),
    selectedModel: "gpt-4o",
    setSelectedModel: vi.fn(),
  };
};
