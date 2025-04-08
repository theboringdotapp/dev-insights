import { useState, useCallback } from "react";
import { PullRequestItem, PullRequestMetrics, DeveloperStats } from "./types";
import { useGitHubService } from "./useGitHubService";
import {
  AIAnalysisConfig,
  PRAnalysisResult,
  analyzePRWithAI,
  aggregateFeedback,
  formatPRFilesForAnalysis,
} from "./aiAnalysisService";

export type PRWithMetrics = PullRequestItem & { metrics?: PullRequestMetrics };

/**
 * Hook for lazy-loading PR metrics and AI analysis
 */
export function usePRMetrics() {
  const { service, isReady } = useGitHubService();
  const [metricsCache, setMetricsCache] = useState<
    Record<number, PullRequestMetrics>
  >({});
  const [prAnalysisCache, setPRAnalysisCache] = useState<
    Record<number, PRAnalysisResult>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<ReturnType<
    typeof aggregateFeedback
  > | null>(null);

  /**
   * Load metrics for a specific PR
   */
  const loadPRMetrics = useCallback(
    async (pr: PullRequestItem) => {
      if (!isReady || !service || !pr.number) return null;

      // Skip if already loading or loaded
      if (metricsCache[pr.id]?.isLoading || metricsCache[pr.id]?.isLoaded) {
        return metricsCache[pr.id];
      }

      try {
        // Extract repo owner and name from repository_url or html_url
        const repoInfo = extractRepoInfo(pr);
        if (!repoInfo) {
          throw new Error("Could not extract repository information from PR");
        }

        // Set loading state
        setMetricsCache((prev) => ({
          ...prev,
          [pr.id]: {
            changeRequestCount: 0,
            durationInDays: 0,
            commentCount: 0,
            commits: [],
            isLoading: true,
            isLoaded: false,
          },
        }));

        // Fetch PR details including reviews
        const prDetails = await service.getPullRequestDetails({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          pullNumber: pr.number,
        });

        // Calculate metrics
        const changeRequestCount = countChangeRequests(prDetails.reviews);
        const commentCount = countReviewComments(
          prDetails.reviews,
          prDetails.comments
        );
        const durationInDays = calculateDuration(pr.created_at, pr.closed_at);

        // Update cache with loaded metrics
        const metrics = {
          changeRequestCount,
          commentCount,
          durationInDays,
          commits: prDetails.commits || [],
          isLoading: false,
          isLoaded: true,
        };

        setMetricsCache((prev) => ({
          ...prev,
          [pr.id]: metrics,
        }));

        return metrics;
      } catch (error) {
        console.error("Error loading PR metrics:", error);

        // Update cache with error state
        const errorMetrics = {
          changeRequestCount: 0,
          durationInDays: 0,
          commentCount: 0,
          commits: [],
          isLoading: false,
          isLoaded: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };

        setMetricsCache((prev) => ({
          ...prev,
          [pr.id]: errorMetrics,
        }));

        return errorMetrics;
      }
    },
    [isReady, service, metricsCache]
  );

  /**
   * Get metrics for a PR (from cache or trigger load)
   */
  const getPRMetrics = useCallback(
    (pr: PullRequestItem): PullRequestMetrics | undefined => {
      if (metricsCache[pr.id]) {
        return metricsCache[pr.id];
      }

      // Initiate load if not already in cache
      loadPRMetrics(pr);
      return undefined;
    },
    [metricsCache, loadPRMetrics]
  );

  /**
   * Enhance PRs with metrics data
   */
  const enhancePRsWithMetrics = useCallback(
    (prs: PullRequestItem[]): PRWithMetrics[] => {
      return prs.map((pr) => ({
        ...pr,
        metrics: metricsCache[pr.id],
      }));
    },
    [metricsCache]
  );

  // Function to calculate filtered stats based on filtered PRs
  const calculateFilteredStats = (
    prs: PullRequestItem[],
    originalStats: DeveloperStats
  ): DeveloperStats => {
    // For pull request count, we can use the length of filtered PRs
    const pullRequestCount = prs.length;

    // For commit count, we estimate based on the ratio of PRs
    const commitRatio = prs.length / originalStats.pullRequestCount;
    const commitCount = Math.round(originalStats.commitCount * commitRatio);

    // For review count, we use the same ratio as PR count
    // This is an approximation as we don't know exactly which reviews are for which PRs
    const reviewCount = Math.round(originalStats.reviewCount * commitRatio);

    return {
      pullRequestCount,
      commitCount: isNaN(commitCount) ? 0 : commitCount,
      reviewCount: isNaN(reviewCount) ? 0 : reviewCount,
    };
  };

  /**
   * Analyzes a PR's code with AI
   */
  const analyzePRCode = useCallback(
    async (
      pr: PullRequestItem,
      config: AIAnalysisConfig
    ): Promise<PRAnalysisResult | null> => {
      if (!isReady || !service || !pr.number) return null;

      try {
        // Extract repo owner and name
        const repoInfo = extractRepoInfo(pr);
        if (!repoInfo) {
          throw new Error("Could not extract repository information from PR");
        }

        // Get PR files
        const files = await service.getPullRequestFiles({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          pullNumber: pr.number,
        });

        // Format the PR content for analysis
        const prContent = formatPRFilesForAnalysis(files, pr.title, pr.number);

        // Analyze with AI
        const feedback = await analyzePRWithAI(prContent, config);

        // Cache and return result
        const result: PRAnalysisResult = {
          prId: pr.id,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.html_url,
          feedback,
        };

        setPRAnalysisCache((prev) => ({
          ...prev,
          [pr.id]: result,
        }));

        return result;
      } catch (error) {
        console.error("Error analyzing PR code:", error);
        const errorResult: PRAnalysisResult = {
          prId: pr.id,
          prNumber: pr.number || 0,
          prTitle: pr.title,
          prUrl: pr.html_url,
          feedback: {
            strengths: [],
            areas_for_improvement: ["Analysis failed"],
            growth_opportunities: [],
            career_impact_summary: "Failed to analyze PR",
          },
          error: error instanceof Error ? error.message : "Unknown error",
        };

        setPRAnalysisCache((prev) => ({
          ...prev,
          [pr.id]: errorResult,
        }));

        return errorResult;
      }
    },
    [isReady, service]
  );

  /**
   * Analyzes multiple PRs and aggregates the results
   */
  const analyzeMultiplePRs = useCallback(
    async (
      prs: PullRequestItem[],
      config: AIAnalysisConfig,
      maxPRs = 10
    ): Promise<void> => {
      if (!prs.length || !isReady || !service) return;

      try {
        setIsAnalyzing(true);
        setAnalysisSummary(null);

        // Select a subset of PRs if there are too many
        const prsToAnalyze = prs.length > maxPRs ? prs.slice(0, maxPRs) : prs;

        // Analyze PRs in sequence to avoid rate limits
        const results: PRAnalysisResult[] = [];

        for (const pr of prsToAnalyze) {
          const result = await analyzePRCode(pr, config);
          if (result) results.push(result);
        }

        // Aggregate results
        const summary = aggregateFeedback(results);
        setAnalysisSummary(summary);
      } catch (error) {
        console.error("Error analyzing multiple PRs:", error);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isReady, service, analyzePRCode]
  );

  // Return the extended hook functionality
  return {
    getPRMetrics,
    loadPRMetrics,
    enhancePRsWithMetrics,
    metricsCache,
    calculateFilteredStats,
    // AI analysis methods
    analyzePRCode,
    analyzeMultiplePRs,
    prAnalysisCache,
    isAnalyzing,
    analysisSummary,
  };
}

/**
 * Extract owner and repo from PR URL or repository_url
 */
function extractRepoInfo(
  pr: PullRequestItem
): { owner: string; repo: string } | null {
  try {
    // Try from repository_url first
    if (pr.repository_url) {
      const repoUrlParts = pr.repository_url.split("/");
      if (repoUrlParts.length >= 2) {
        return {
          owner: repoUrlParts[repoUrlParts.length - 2],
          repo: repoUrlParts[repoUrlParts.length - 1],
        };
      }
    }

    // Fall back to html_url
    const urlParts = pr.html_url.split("/");
    const pullIndex = urlParts.indexOf("pull");
    if (pullIndex >= 3) {
      return {
        owner: urlParts[pullIndex - 2],
        repo: urlParts[pullIndex - 1],
      };
    }

    return null;
  } catch (e) {
    console.error("Error extracting repo info:", e);
    return null;
  }
}

/**
 * Count the number of change requests in PR reviews
 */
function countChangeRequests(reviews: { state: string }[]): number {
  // Filter reviews with state 'CHANGES_REQUESTED'
  return reviews.filter((review) => review.state === "CHANGES_REQUESTED")
    .length;
}

/**
 * Count the number of review comments in PR reviews
 */
function countReviewComments(
  reviews: { body?: string; state: string }[],
  comments?: unknown[]
): number {
  // Count reviews that have comments (non-empty body)
  const reviewCommentCount = reviews.filter(
    (review) => review.body && review.body.trim().length > 0
  ).length;

  // Add inline comments if available
  const inlineCommentCount = comments?.length || 0;

  return reviewCommentCount + inlineCommentCount;
}

/**
 * Calculate duration between PR creation and closure in days
 */
function calculateDuration(createdAt: string, closedAt?: string): number {
  if (!closedAt) {
    // If PR is not closed, calculate duration until now
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return Math.round((now - created) / (1000 * 60 * 60 * 24));
  }

  const created = new Date(createdAt).getTime();
  const closed = new Date(closedAt).getTime();
  return Math.round((closed - created) / (1000 * 60 * 60 * 24));
}
