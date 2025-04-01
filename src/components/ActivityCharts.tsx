import React, { useEffect, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
} from "recharts";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";

// Interface for the component props
interface ActivityChartsProps {
  pullRequests: PullRequestItem[];
  showOnlyImportantPRs: boolean;
  onCommitDataLoaded?: (commitCount: number, isLoading: boolean) => void;
}

export function ActivityCharts({
  pullRequests,
  showOnlyImportantPRs,
  onCommitDataLoaded,
}: ActivityChartsProps) {
  const { getPRMetrics, loadPRMetrics } = usePRMetrics();
  const [isLoading, setIsLoading] = useState(true);
  const [realCommitCount, setRealCommitCount] = useState(0);
  const [loadedPRCount, setLoadedPRCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Define chart colors to match stats display
  const colors = {
    pullRequests: "#3b82f6", // Blue 500
    commits: "#22c55e", // Green 500
  };

  // Load PR metrics for all PRs if not already loaded
  useEffect(() => {
    if (!pullRequests.length) {
      setIsLoading(false);
      onCommitDataLoaded?.(0, false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadedPRCount(0);
      setError(null);

      // Notify parent component that we're loading commit data
      onCommitDataLoaded?.(0, true);

      // Initialize counters
      let completedPRs = 0;
      let totalCommits = 0;

      // Check if we already have metrics for all PRs
      const allPRsHaveMetrics = pullRequests.every((pr) => {
        const metrics = getPRMetrics(pr);
        if (metrics?.isLoaded) {
          completedPRs++;
          totalCommits += metrics.commits?.length || 0;
          return true;
        }
        return false;
      });

      // If all PRs already have metrics, we're done
      if (allPRsHaveMetrics) {
        setRealCommitCount(totalCommits);
        setLoadedPRCount(pullRequests.length);
        setIsLoading(false);
        onCommitDataLoaded?.(totalCommits, false);
        return;
      }

      // Load metrics for each PR that doesn't have them
      pullRequests.forEach((pr) => {
        const metrics = getPRMetrics(pr);
        if (!metrics?.isLoaded && !metrics?.isLoading) {
          // Start loading metrics for this PR
          loadPRMetrics(pr)
            .then((loadedMetrics) => {
              if (loadedMetrics) {
                completedPRs++;
                totalCommits += loadedMetrics.commits?.length || 0;

                // Update state to reflect progress
                setRealCommitCount(totalCommits);
                setLoadedPRCount(completedPRs);

                // Update parent with current commit count and loading state
                onCommitDataLoaded?.(
                  totalCommits,
                  completedPRs < pullRequests.length
                );

                // Set loading to false when all PRs are loaded
                if (completedPRs === pullRequests.length) {
                  setIsLoading(false);
                }
              }
            })
            .catch((err) => {
              console.error("Error loading PR metrics:", err);
              // Continue even if one PR fails to load
              completedPRs++;
              setLoadedPRCount(completedPRs);
              if (completedPRs === pullRequests.length) {
                setIsLoading(false);
                onCommitDataLoaded?.(totalCommits, false);
              }
            });
        }
      });
    } catch (err) {
      console.error("Error in ActivityCharts useEffect:", err);
      setError("Failed to load PR metrics data");
      setIsLoading(false);
      onCommitDataLoaded?.(0, false);
    }
  }, [pullRequests, getPRMetrics, loadPRMetrics, onCommitDataLoaded]);

  // Generate activity data combining PR and commit frequencies
  const activityData = useMemo(() => {
    if (!pullRequests.length) return [];

    try {
      // Create a map to store activity by week
      const weekMap: Record<
        string,
        {
          date: string;
          prs: number;
          commits: number;
        }
      > = {};

      // Sort by creation date (ascending)
      const sortedPRs = [...pullRequests].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Get the date range
      const oldestPR = new Date(sortedPRs[0].created_at);
      const latestPR = new Date(sortedPRs[sortedPRs.length - 1].created_at);

      // Generate all weeks in the date range
      const currentDate = new Date(oldestPR);
      while (currentDate <= latestPR) {
        const weekKey = getWeekKey(currentDate);
        const formattedDate = formatDateForDisplay(currentDate);

        weekMap[weekKey] = {
          date: formattedDate,
          prs: 0,
          commits: 0,
        };

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
      }

      // Count PRs by week
      pullRequests.forEach((pr) => {
        const date = new Date(pr.created_at);
        const weekKey = getWeekKey(date);

        if (weekMap[weekKey]) {
          weekMap[weekKey].prs += 1;

          // Add real commit data if available
          const metrics = getPRMetrics(pr);
          if (metrics?.isLoaded && metrics.commits) {
            weekMap[weekKey].commits += metrics.commits.length;
          }
        }
      });

      // Convert map to array and sort by date
      return Object.values(weekMap).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (err) {
      console.error("Error generating activity data:", err);
      setError("Failed to process activity data");
      return [];
    }
  }, [pullRequests, getPRMetrics]);

  // Calculate loading progress percentage
  const loadingProgress = pullRequests.length
    ? Math.round((loadedPRCount / pullRequests.length) * 100)
    : 100;

  // If there's no data, show a message
  if (!pullRequests.length) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
        No pull request data available for analysis.
      </div>
    );
  }

  // If there was an error, show error message
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-center text-red-500">
        {error}
      </div>
    );
  }

  // Debug
  console.log("Activity data:", activityData);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Developer Activity
          {showOnlyImportantPRs && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Important PRs only)
            </span>
          )}
        </h3>

        {isLoading && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <span>
              Loading commits data ({loadedPRCount}/{pullRequests.length} PRs)
            </span>
          </div>
        )}

        {!isLoading && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{realCommitCount}</span> commits from{" "}
            <span className="font-medium">{pullRequests.length}</span> PRs
          </div>
        )}
      </div>

      {activityData.length > 0 ? (
        <div className="h-80 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activityData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                yAxisId="left"
                label={{ value: "Commits", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: "PRs", angle: 90, position: "insideRight" }}
              />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="commits"
                name="Commits"
                fill={colors.commits}
                barSize={20}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="prs"
                name="Pull Requests"
                stroke={colors.pullRequests}
                activeDot={{ r: 8 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 bg-gray-50 p-4 rounded-lg flex items-center justify-center">
          <div className="text-gray-500">
            {isLoading
              ? "Loading chart data..."
              : "No activity data available to display"}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  // Get the ISO week number (1-52/53)
  const weekNum = getISOWeek(date);
  return `${year}-W${weekNum.toString().padStart(2, "0")}`;
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
