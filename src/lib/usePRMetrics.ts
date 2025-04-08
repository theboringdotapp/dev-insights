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
import cacheService from "./cacheService";

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
        // First, check if we have cached results
        const cachedResult = await cacheService.getPRAnalysis(pr.id);
        if (cachedResult) {
          console.log(`Using cached analysis for PR #${pr.number}`);

          // Update the in-memory cache
          setPRAnalysisCache((prev) => ({
            ...prev,
            [pr.id]: cachedResult,
          }));

          return cachedResult;
        }

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

        // Create analysis result
        const result: PRAnalysisResult = {
          prId: pr.id,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.html_url,
          feedback,
        };

        // Update in-memory cache
        setPRAnalysisCache((prev) => ({
          ...prev,
          [pr.id]: result,
        }));

        // Store in persistent cache
        await cacheService.cachePRAnalysis(result);

        return result;
      } catch (error) {
        console.error("Error analyzing PR code:", error);
        return null;
      }
    },
    [isReady, service]
  );

  /**
   * Analyzes multiple PRs with AI
   */
  const analyzeMultiplePRs = useCallback(
    async (
      prs: PullRequestItem[],
      config: AIAnalysisConfig,
      maxPRs = 5
    ): Promise<PRAnalysisResult[]> => {
      if (!isReady || !service || prs.length === 0) return [];

      setIsAnalyzing(true);
      setAnalysisSummary(null);

      try {
        // First, check cache for existing analysis
        const cachedResults: PRAnalysisResult[] = [];
        const prsToAnalyze: PullRequestItem[] = [];

        // Check cache for each PR
        for (const pr of prs.slice(0, maxPRs)) {
          const cachedResult = await cacheService.getPRAnalysis(pr.id);
          if (cachedResult) {
            cachedResults.push(cachedResult);
          } else {
            prsToAnalyze.push(pr);
          }
        }

        console.log(
          `Found ${cachedResults.length} cached analyses, need to analyze ${prsToAnalyze.length} PRs`
        );

        // Update the analysis cache with cached results
        const newCache = { ...prAnalysisCache };
        for (const result of cachedResults) {
          newCache[result.prId] = result;
        }
        setPRAnalysisCache(newCache);

        // If we have all results cached and there's nothing to analyze
        if (prsToAnalyze.length === 0) {
          const summary = aggregateFeedback(cachedResults);
          setAnalysisSummary(summary);
          setIsAnalyzing(false);
          return cachedResults;
        }

        // Analyze remaining PRs sequentially
        const newResults: PRAnalysisResult[] = [];
        for (const pr of prsToAnalyze) {
          const result = await analyzePRCode(pr, config);
          if (result) {
            newResults.push(result);
          }
        }

        // Combine cached and new results
        const allResults = [...cachedResults, ...newResults];

        // Update summary
        if (allResults.length > 0) {
          const summary = aggregateFeedback(allResults);
          setAnalysisSummary(summary);
        }

        return allResults;
      } catch (error) {
        console.error("Error analyzing multiple PRs:", error);
        return [];
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isReady, service, prAnalysisCache, analyzePRCode]
  );

  /**
   * Analyze a single PR and update the aggregated analysis
   */
  const analyzeAdditionalPR = useCallback(
    async (
      pr: PullRequestItem,
      config: AIAnalysisConfig
    ): Promise<PRAnalysisResult | null> => {
      setIsAnalyzing(true);

      try {
        // Analyze the PR
        const result = await analyzePRCode(pr, config);

        if (result) {
          // Update the aggregated analysis by including this PR
          const currentResults = Object.values(prAnalysisCache);
          const updatedResults = [...currentResults, result];

          if (updatedResults.length > 0) {
            const summary = aggregateFeedback(updatedResults);
            setAnalysisSummary(summary);
          }

          return result;
        }

        return null;
      } catch (error) {
        console.error("Error analyzing additional PR:", error);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [analyzePRCode, prAnalysisCache]
  );

  // Create a function to get PR analysis that checks both memory and persistent cache
  const getAnalysisForPR = useCallback(
    async (prId: number): Promise<PRAnalysisResult | null> => {
      // First check in-memory cache
      if (prAnalysisCache[prId]) {
        return prAnalysisCache[prId];
      }

      // If not in memory, check persistent cache
      try {
        const cachedResult = await cacheService.getPRAnalysis(prId);

        // If found in persistent cache, update in-memory cache
        if (cachedResult) {
          console.log(`Found PR #${prId} in persistent cache`);
          setPRAnalysisCache((prev) => ({
            ...prev,
            [prId]: cachedResult,
          }));
          return cachedResult;
        }
      } catch (error) {
        console.error("Error checking cache for PR analysis:", error);
      }

      return null;
    },
    [prAnalysisCache]
  );

  // Create a synchronous version that only checks in-memory cache
  // This is useful for UI components that need immediate results
  const getAnalysisFromMemoryCache = useCallback(
    (prId: number): PRAnalysisResult | null => {
      return prAnalysisCache[prId] || null;
    },
    [prAnalysisCache]
  );

  // Return the extended hook functionality
  return {
    getPRMetrics,
    loadPRMetrics,
    enhancePRsWithMetrics,
    metricsCache,
    calculateFilteredStats,
    analyzeMultiplePRs,
    analyzeAdditionalPR,
    isAnalyzing,
    analysisSummary,
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
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
  const created = new Date(createdAt).getTime();
  const closed = closedAt ? new Date(closedAt).getTime() : Date.now();
  return Math.round((closed - created) / (1000 * 60 * 60 * 24));
}
