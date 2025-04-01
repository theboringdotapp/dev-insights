import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { GitHubDevService, GitHubServiceError } from "./octokit-service";
import { DeveloperPerformanceData } from "./types";

/**
 * Hook for using the GitHub service with authentication
 */
export function useGitHubService() {
  const { accessToken, isAuthenticated } = useAuth();
  const [service, setService] = useState<GitHubDevService | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create or recreate the service when token changes
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      try {
        const githubService = new GitHubDevService(accessToken);
        setService(githubService);
        setError(null);
      } catch (e) {
        console.error("Failed to initialize GitHub service:", e);
        setError("Failed to initialize GitHub service");
        setService(null);
      }
    } else {
      setService(null);
    }
  }, [accessToken, isAuthenticated]);

  return {
    service,
    error,
    isReady: !!service && isAuthenticated,
  };
}

/**
 * Utility hook for fetching developer performance data
 * @param username GitHub username to analyze
 * @param org Optional organization name
 * @param repo Optional repository name
 * @param searchTrigger A value that triggers the search when it changes
 */
export function useDeveloperPerformance(
  username: string,
  org?: string,
  repo?: string,
  searchTrigger?: number
) {
  const { service, isReady } = useGitHubService();
  const [data, setData] = useState<DeveloperPerformanceData>({
    pullRequests: [],
    reviews: [],
    stats: null,
    isLoading: false,
    error: null,
  });

  // Calculate date 30 days ago for default timeframe
  const getThirtyDaysAgo = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString();
  };

  // Fetch developer data when service and username are available and searchTrigger changes
  useEffect(() => {
    if (!isReady || !username || searchTrigger === undefined) return;

    const fetchData = async () => {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get data in parallel
        const [pullRequests, reviews, stats] = await Promise.all([
          service!.getUserPullRequests({ username, org, repo }),
          service!.getUserReviews({ username, org, repo }),
          service!.getUserStats({
            username,
            org,
            repo,
            since: getThirtyDaysAgo(),
          }),
        ]);

        setData({
          pullRequests,
          reviews,
          stats,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching developer data:", error);
        let errorMessage = "Failed to fetch developer performance data";

        if (error instanceof GitHubServiceError) {
          errorMessage = error.message;
        }

        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    };

    fetchData();
  }, [isReady, service, username, org, repo, searchTrigger]);

  return data;
}
