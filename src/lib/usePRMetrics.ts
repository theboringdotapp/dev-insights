import { useState, useCallback } from "react";
import {
  PullRequestItem,
  PullRequestMetrics,
  DeveloperStats,
  PRAnalysisResult,
} from "./types";
import { useGitHubService } from "./useGitHubService";
import { useAnalysisStore } from "../stores/analysisStore";
import {
  AIAnalysisConfig,
  analyzePRWithAI,
  formatPRFilesForAnalysis,
} from "./aiAnalysisService";
import cacheService from "./cacheService";
import { toast } from "sonner";

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

      return undefined;
    },
    [metricsCache]
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

      // Get Zustand actions inside the callback if not passed as args
      const { startAnalysis, completeAnalysis, failAnalysis } =
        useAnalysisStore.getState();
      const previouslyAnalyzed = !!useAnalysisStore
        .getState()
        .allAnalyzedPRIds.has(pr.id);

      startAnalysis(pr.id); // Mark as analyzing *before* doing work
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

          // Update the hook's internal memory cache as well
          setPRAnalysisCache((prev) => ({ ...prev, [pr.id]: cachedResult }));

          // *** IMPORTANT FIX: Mark as complete even if from cache ***
          completeAnalysis(pr.id, !previouslyAnalyzed);
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

        // Log config before calling the analysis service
        console.log(
          `[usePRMetrics] analyzePRCode for PR #${pr.number}: Passing config to analyzePRWithAI:`,
          JSON.stringify(config)
        );

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

        completeAnalysis(pr.id, !previouslyAnalyzed); // Mark as complete
        return result;
      } catch (error) {
        console.error(`Error analyzing PR #${pr.number} (${pr.title}):`, error);
        failAnalysis(pr.id); // Mark as failed

        // Show toast notification - Ensure the actual error message is shown
        let displayMessage = "An unknown error occurred during analysis";
        if (error instanceof Error) {
          // Use the message from the error object caught here
          displayMessage = error.message;
          // If the error message itself is generic, but contains a more specific cause
          // (like the error thrown from analyzePRWithAI/analyzeWithClaude), use that.
          // Note: Standard 'Error' might not have a 'cause', depends on how it was thrown.
          // We'll rely on the message being descriptive enough for now.
          // Example: If analyzeWithClaude throws 'Error: Failed to parse Claude response. Error: ...',
          // that full message should be displayed.
        }

        toast.error(`Analysis Error (PR #${pr.number})`, {
          description: displayMessage,
          duration: 7000, // Increase duration slightly more for errors
        });

        return null;
      }
    },
    [isReady, service, analyzePRWithAI, formatPRFilesForAnalysis, cacheService]
  );

  // Get Zustand actions
  const { startAnalysis, completeAnalysis, failAnalysis } =
    useAnalysisStore.getState();

  /**
   * Analyzes multiple PRs with AI
   */
  const analyzeMultiplePRs = useCallback(
    async (
      prs: PullRequestItem[],
      config: AIAnalysisConfig,
      maxPRs = 5
    ): Promise<PRAnalysisResult[]> => {
      // This function now focuses on orchestration and updating store state
      // The actual aggregation happens in the calling component

      const allResults: PRAnalysisResult[] = [];
      const previouslyAnalyzedIds = new Set(
        useAnalysisStore.getState().allAnalyzedPRIds
      );

      // Determine which PRs to analyze based on maxPRs limit
      const prsToProcess = prs.slice(0, maxPRs);

      // Use Promise.allSettled to run analyses concurrently and handle individual errors
      const analysisPromises = prsToProcess.map(async (pr) => {
        const wasNewlyAnalyzed = !previouslyAnalyzedIds.has(pr.id);
        startAnalysis(pr.id); // Update store: PR analysis started
        try {
          const result = await analyzePRCode(pr, config);
          if (result) {
            completeAnalysis(pr.id, wasNewlyAnalyzed); // Update store: success
            return result;
          } else {
            // Assume analyzePRCode returning null means failure/skip
            failAnalysis(pr.id); // Update store: failure
            return null;
          }
        } catch (error) {
          console.error(`Error analyzing PR ${pr.id}:`, error);
          failAnalysis(pr.id); // Update store: failure
          return null; // Return null or a specific error object if needed
        }
      });

      const settledResults = await Promise.allSettled(analysisPromises);

      // Collect successful results
      settledResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          allResults.push(result.value);
        }
        // Failures are already handled in the catch block above by calling failAnalysis
      });

      // Return only the successfully obtained analysis results
      // The calling component will handle aggregation and updating the summary state
      return allResults;
    },
    // Dependencies: include store actions
    [analyzePRCode, startAnalysis, completeAnalysis, failAnalysis]
  );

  /**
   * Analyze a single PR and update the aggregated analysis
   */
  const analyzeAdditionalPR = useCallback(
    async (
      pr: PullRequestItem,
      config: AIAnalysisConfig
    ): Promise<PRAnalysisResult | null> => {
      // This function now simply delegates to analyzePRCode,
      // which handles store updates and caching.
      try {
        // Analyze the PR
        const result = await analyzePRCode(pr, config);

        return result;
      } catch (error) {
        // Error is logged within analyzePRCode, failAnalysis is called there too.
        console.error("Error analyzing additional PR:", error);
        return null;
      }
    },
    [analyzePRCode] // Depends only on analyzePRCode now
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
