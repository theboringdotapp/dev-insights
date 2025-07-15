import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Timeframe } from "../components/TimeframeSelector";
import { useAuth } from "../lib/auth";
import { GitHubDevService, GitHubServiceError } from "../lib/octokit-service";
import { isImportantPR } from "../lib/prUtils";
import { PullRequestItem } from "../lib/types";

export interface TeamMemberData {
  username: string;
  pullRequestCount: number;
  reviewCount: number;
  importantPullRequestCount: number;
  totalPullRequestCount: number;
  avgDaysToClose: number;
  changesRequestedCount: number;
  isLoading: boolean;
  error?: string;
  pullRequests: PullRequestItem[];
  reviews: unknown[];
}

export interface TeamStats {
  avgPullRequests: number;
  avgImportantPullRequests: number;
  avgReviews: number;
  totalPullRequests: number;
  totalImportantPullRequests: number;
  totalReviews: number;
  memberCount: number;
}

export interface TeamPerformanceData {
  members: Record<string, TeamMemberData>;
  teamStats: TeamStats;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook for fetching performance data for multiple team members
 * Uses only high-level GitHub API calls for simplicity
 */
export function useTeamPerformance(
  usernames: string[],
  timeframe: Timeframe = "1month"
) {
  const { accessToken, isAuthenticated } = useAuth();
  const [data, setData] = useState<TeamPerformanceData>({
    members: {},
    teamStats: {
      avgPullRequests: 0,
      avgImportantPullRequests: 0,
      avgReviews: 0,
      totalPullRequests: 0,
      totalImportantPullRequests: 0,
      totalReviews: 0,
      memberCount: 0,
    },
    isLoading: false,
    error: undefined,
  });

  // Use useRef to track fetched members to avoid dependency issues
  const fetchedMembersRef = useRef<Set<string>>(new Set());

  // Memoize usernames array to prevent infinite loops from reference changes
  const stableUsernames = useMemo(() => usernames, [usernames.join(",")]);

  // Helper function to get timeframe date
  const getTimeframeDate = useCallback((timeframe: Timeframe): string => {
    const now = new Date();
    const days = {
      "1week": 7,
      "1month": 30,
      "3months": 90,
      "6months": 180,
      "1year": 365,
    }[timeframe];

    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return since.toISOString();
  }, []);

  // Fetch data for a single team member
  const fetchMemberData = useCallback(
    async (
      username: string,
      service: GitHubDevService,
      currentTimeframe: Timeframe
    ) => {
      try {
        const since = getTimeframeDate(currentTimeframe);

        // Set loading state for this member only
        setData((prev) => ({
          ...prev,
          members: {
            ...prev.members,
            [username]: {
              username,
              pullRequestCount: 0,
              reviewCount: 0,
              importantPullRequestCount: 0,
              totalPullRequestCount: 0,
              avgDaysToClose: 0,
              changesRequestedCount: 0,
              isLoading: true,
              pullRequests: [],
              reviews: [],
            },
          },
        }));

        // Fetch high-level data in parallel (no individual PR details)
        const [pullRequests, reviews, stats] = await Promise.all([
          service.getUserPullRequests({
            username,
            since,
            maxItems: 150, // Just count, don't need details
          }),
          service.getUserReviews({ username, since }),
          service.getUserStats({ username, since }),
        ]);

        // Calculate average days to close for PRs that are closed
        const closedPRs = pullRequests.filter(
          (pr) => pr.state === "closed" && pr.closed_at
        );
        const avgDaysToClose =
          closedPRs.length > 0
            ? closedPRs.reduce((sum, pr) => {
                const created = new Date(pr.created_at);
                const closed = new Date(pr.closed_at!);
                const days =
                  (closed.getTime() - created.getTime()) /
                  (1000 * 60 * 60 * 24);
                return sum + days;
              }, 0) / closedPRs.length
            : 0;

        // Count changes requested (simplified estimate based on PR titles/descriptions)
        const changesRequestedCount = pullRequests.filter(
          (pr) =>
            pr.title.toLowerCase().includes("fix") ||
            pr.title.toLowerCase().includes("refactor") ||
            (pr.body && pr.body.toLowerCase().includes("requested changes"))
        ).length;

        // Update member data - no longer loading
        setData((prev) => ({
          ...prev,
          members: {
            ...prev.members,
            [username]: {
              username,
              pullRequestCount: stats.pullRequestCount,
              reviewCount: stats.reviewCount,
              importantPullRequestCount:
                pullRequests.filter(isImportantPR).length,
              totalPullRequestCount: pullRequests.length,
              avgDaysToClose: Math.round(avgDaysToClose * 10) / 10,
              changesRequestedCount,
              isLoading: false,
              pullRequests,
              reviews,
            },
          },
        }));

        // Mark this member as fetched for current timeframe
        fetchedMembersRef.current.add(`${username}-${currentTimeframe}`);
      } catch (error) {
        console.error(`Error fetching data for ${username}:`, error);

        let errorMessage = "Failed to fetch member data";
        if (error instanceof GitHubServiceError) {
          errorMessage = error.message;
        }

        setData((prev) => ({
          ...prev,
          members: {
            ...prev.members,
            [username]: {
              username,
              pullRequestCount: 0,
              reviewCount: 0,
              importantPullRequestCount: 0,
              totalPullRequestCount: 0,
              avgDaysToClose: 0,
              changesRequestedCount: 0,
              isLoading: false,
              error: errorMessage,
              pullRequests: [],
              reviews: [],
            },
          },
        }));
      }
    },
    [getTimeframeDate]
  );

  // Calculate team statistics when member data changes
  const teamStats = useMemo(() => {
    const membersList = Object.values(data.members).filter(
      (member) => !member.isLoading && !member.error
    );

    if (membersList.length === 0) {
      return {
        avgPullRequests: 0,
        avgImportantPullRequests: 0,
        avgReviews: 0,
        totalPullRequests: 0,
        totalImportantPullRequests: 0,
        totalReviews: 0,
        memberCount: 0,
      };
    }

    const totalPullRequests = membersList.reduce(
      (sum, member) => sum + member.pullRequestCount,
      0
    );
    const totalImportantPullRequests = membersList.reduce(
      (sum, member) => sum + member.importantPullRequestCount,
      0
    );
    const totalReviews = membersList.reduce(
      (sum, member) => sum + member.reviewCount,
      0
    );

    return {
      avgPullRequests:
        Math.round((totalPullRequests / membersList.length) * 10) / 10,
      avgImportantPullRequests:
        Math.round((totalImportantPullRequests / membersList.length) * 10) / 10,
      avgReviews: Math.round((totalReviews / membersList.length) * 10) / 10,
      totalPullRequests,
      totalImportantPullRequests,
      totalReviews,
      memberCount: membersList.length,
    };
  }, [data.members]);

  // Clear fetched members when timeframe changes
  useEffect(() => {
    fetchedMembersRef.current = new Set();
    // Also clear members data to refetch for new timeframe
    setData((prev) => ({
      ...prev,
      members: {},
    }));
  }, [timeframe]);

  // Main effect to fetch data for team members
  useEffect(() => {
    if (!isAuthenticated || !accessToken || stableUsernames.length === 0) {
      setData((prev) => ({
        ...prev,
        members: {},
        error: undefined,
      }));
      return;
    }

    const service = new GitHubDevService(accessToken);

    // Only fetch data for members we haven't fetched yet for this timeframe
    const membersToFetch = stableUsernames.filter(
      (username) => !fetchedMembersRef.current.has(`${username}-${timeframe}`)
    );

    if (membersToFetch.length === 0) {
      return; // All members already fetched for this timeframe
    }

    // Fetch data for new members individually (not in parallel to avoid overwhelming API)
    membersToFetch.forEach((username) => {
      fetchMemberData(username, service, timeframe);
    });
  }, [
    stableUsernames,
    timeframe,
    isAuthenticated,
    accessToken,
    fetchMemberData,
  ]);

  // Return data with computed teamStats (don't store teamStats in state to avoid loops)
  return {
    ...data,
    teamStats,
  };
}
