import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { GitHubDevService, GitHubServiceError } from "./octokit-service";
import { DeveloperPerformanceData } from "./types";
import { Timeframe } from "../components/TimeframeSelector";

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
 * Calculate the date for the given timeframe
 */
function getTimeframeDate(timeframe: Timeframe): string {
  const date = new Date();

  switch (timeframe) {
    case "1week":
      date.setDate(date.getDate() - 7);
      break;
    case "1month":
      date.setMonth(date.getMonth() - 1);
      break;
    case "3months":
      date.setMonth(date.getMonth() - 3);
      break;
    case "6months":
      date.setMonth(date.getMonth() - 6);
      break;
    case "1year":
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      date.setMonth(date.getMonth() - 1); // Default to 1 month
  }

  return date.toISOString();
}

/**
 * Utility hook for fetching developer performance data
 * @param username GitHub username to analyze
 * @param org Optional organization name
 * @param repo Optional repository name
 * @param timeframe Timeframe to filter data
 * @param searchTrigger A value that triggers the search when it changes
 */
export function useDeveloperPerformance(
  username: string,
  org?: string,
  repo?: string,
  timeframe: Timeframe = "1month",
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

  // Fetch developer data when service and username are available and searchTrigger changes
  useEffect(() => {
    if (!isReady || !username || searchTrigger === undefined) return;

    const fetchData = async () => {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const since = getTimeframeDate(timeframe);

        // Get data in parallel
        const [pullRequests, reviews, stats] = await Promise.all([
          service!.getUserPullRequests({
            username,
            org,
            repo,
            since,
            // Increase maxItems for longer timeframes
            maxItems:
              timeframe === "3months"
                ? 300
                : timeframe === "6months"
                ? 500
                : timeframe === "1year"
                ? 750
                : 150,
          }),
          service!.getUserReviews({ username, org, repo, since }),
          service!.getUserStats({
            username,
            org,
            repo,
            since,
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
  }, [isReady, service, username, org, repo, timeframe, searchTrigger]);

  return data;
}
