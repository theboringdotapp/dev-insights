import { useState, useCallback } from "react";
import { PullRequestItem, PullRequestMetrics } from "./types";
import { useGitHubService } from "./useGitHubService";

export type PRWithMetrics = PullRequestItem & { metrics?: PullRequestMetrics };

/**
 * Hook for lazy-loading PR metrics
 */
export function usePRMetrics() {
  const { service, isReady } = useGitHubService();
  const [metricsCache, setMetricsCache] = useState<
    Record<number, PullRequestMetrics>
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

  return {
    getPRMetrics,
    loadPRMetrics,
    enhancePRsWithMetrics,
    metricsCache,
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
