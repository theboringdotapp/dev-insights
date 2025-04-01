import React, { useMemo } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { Timeframe } from "./TimeframeSelector";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface PerformanceMetricsProps {
  pullRequests: PullRequestItem[];
  timeframe: Timeframe;
  realCommitCount: number;
  isLoadingCommits: boolean;
}

export function PerformanceMetrics({
  pullRequests,
  timeframe,
  realCommitCount,
  isLoadingCommits,
}: PerformanceMetricsProps) {
  const { getPRMetrics } = usePRMetrics();

  // Calculate time unit based on timeframe
  const timeUnit = useMemo(() => {
    if (timeframe === "1week") return "day";
    if (
      timeframe === "1month" ||
      timeframe === "3months" ||
      timeframe === "6months"
    )
      return "week";
    return "month";
  }, [timeframe]);

  // Calculate timeframe duration in days
  const timeframeDays = useMemo(() => {
    switch (timeframe) {
      case "1week":
        return 7;
      case "1month":
        return 30;
      case "3months":
        return 90;
      case "6months":
        return 180;
      case "1year":
        return 365;
      default:
        return 30;
    }
  }, [timeframe]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!pullRequests.length) return null;

    // Calculate time period counts
    let timeUnitCount = 1; // Default to avoid division by zero

    switch (timeUnit) {
      case "day":
        timeUnitCount = timeframeDays;
        break;
      case "week":
        // For 1-month timeframe, use a more accurate week count
        if (timeframe === "1month") {
          timeUnitCount = Math.ceil(timeframeDays / 7); // ~4-5 weeks in a month
        } else {
          timeUnitCount = Math.max(1, Math.ceil(timeframeDays / 7));
        }
        break;
      case "month":
        timeUnitCount = Math.max(1, Math.ceil(timeframeDays / 30));
        break;
    }

    // Calculate PR count and average PRs per time unit
    const prCount = pullRequests.length;
    const prsPerTimeUnit = (prCount / timeUnitCount).toFixed(1);

    // Calculate commits per time unit
    const commitsPerTimeUnit = isLoadingCommits
      ? "Loading..."
      : (realCommitCount / timeUnitCount).toFixed(1);

    // Calculate commits per PR
    const commitsPerPR = isLoadingCommits
      ? "Loading..."
      : (realCommitCount / Math.max(1, prCount)).toFixed(1);

    // Calculate PR velocity (average time to close PRs)
    let closedPRCount = 0;
    let totalDurationDays = 0;
    let changeRequestCount = 0;
    let prsWithChangeRequests = 0;

    pullRequests.forEach((pr) => {
      const metrics = getPRMetrics(pr);

      if (pr.closed_at) {
        closedPRCount++;

        // Calculate duration if we don't have metrics yet
        if (!metrics?.isLoaded) {
          const created = new Date(pr.created_at).getTime();
          const closed = new Date(pr.closed_at).getTime();
          totalDurationDays += Math.round(
            (closed - created) / (1000 * 60 * 60 * 24)
          );
        }
      }

      // Use stored metrics if available
      if (metrics?.isLoaded) {
        if (metrics.durationInDays) {
          totalDurationDays += metrics.durationInDays;
        }

        if (metrics.changeRequestCount > 0) {
          prsWithChangeRequests++;
          changeRequestCount += metrics.changeRequestCount;
        }
      }
    });

    // Calculate average days to close
    const avgDaysToClose =
      closedPRCount > 0
        ? (totalDurationDays / closedPRCount).toFixed(1)
        : "N/A";

    // Calculate change request ratio
    const changeRequestRatio =
      pullRequests.length > 0
        ? ((prsWithChangeRequests / pullRequests.length) * 100).toFixed(0)
        : "0";

    // Calculate average changes per PR that had changes
    const avgChangesPerPR =
      prsWithChangeRequests > 0
        ? (changeRequestCount / prsWithChangeRequests).toFixed(1)
        : "0";

    return {
      timeUnit,
      prCount,
      prsPerTimeUnit,
      commitsPerTimeUnit,
      commitsPerPR,
      avgDaysToClose,
      changeRequestRatio,
      avgChangesPerPR,
      closedPRCount,
    };
  }, [
    pullRequests,
    timeUnit,
    timeframeDays,
    realCommitCount,
    isLoadingCommits,
    getPRMetrics,
  ]);

  // Generate trend data for PRs over time
  const trendData = useMemo(() => {
    if (!pullRequests.length) return [];

    // Sort PRs by creation date
    const sortedPRs = [...pullRequests].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group by appropriate time units (days, weeks, months)
    const dataPoints: Record<
      string,
      { date: string; prs: number; commits: number; trend: number }
    > = {};

    sortedPRs.forEach((pr, index) => {
      const date = new Date(pr.created_at);
      let key = "";

      if (timeUnit === "day") {
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      } else if (timeUnit === "week") {
        // Get week number
        const weekNum = getWeekNumber(date);
        key = `${date.getFullYear()}-W${weekNum}`;
      } else {
        // Month
        key = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      }

      if (!dataPoints[key]) {
        dataPoints[key] = {
          date: formatDateForDisplay(date, timeUnit),
          prs: 0,
          commits: 0,
          trend: 0,
        };
      }

      dataPoints[key].prs++;

      // Add commit data if available
      const metrics = getPRMetrics(pr);
      if (metrics?.isLoaded && metrics.commits) {
        dataPoints[key].commits += metrics.commits.length;
      }

      // Calculate running PR average for trend line
      const lookback = 3; // Average over 3 time units
      const start = Math.max(0, index - lookback);
      let sum = 0;
      let count = 0;

      for (let i = start; i <= index; i++) {
        sum++;
        count++;
      }

      dataPoints[key].trend = parseFloat((sum / Math.max(1, count)).toFixed(1));
    });

    // Convert to array and sort by date
    return Object.values(dataPoints).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [pullRequests, timeUnit, getPRMetrics]);

  if (!pullRequests.length || !metrics) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
        No data available for performance analysis.
      </div>
    );
  }

  // Calculate average PRs per time unit for trend chart
  const avgPRs =
    trendData.length > 0
      ? trendData.reduce((sum, item) => sum + item.prs, 0) / trendData.length
      : 0;

  // Calculate average commits per time unit
  const avgCommits =
    trendData.length > 0 && !isLoadingCommits
      ? trendData.reduce((sum, item) => sum + item.commits, 0) /
        trendData.length
      : 0;

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Performance Analysis</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Metrics panel */}
        <div>
          <h4 className="text-base font-medium mb-3">Productivity Metrics</h4>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">PRs per {timeUnit}</span>
              <span className="font-medium">{metrics.prsPerTimeUnit}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Commits per {timeUnit}</span>
              <span className="font-medium">{metrics.commitsPerTimeUnit}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Avg. days to close PRs</span>
              <span className="font-medium">{metrics.avgDaysToClose}</span>
            </div>
          </div>

          <h4 className="text-base font-medium mb-3">Efficiency Metrics</h4>
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Commits per PR</span>
              <span className="font-medium">{metrics.commitsPerPR}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">PRs needing changes</span>
              <span className="font-medium">{metrics.changeRequestRatio}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Avg. change requests per PR</span>
              <span className="font-medium">{metrics.avgChangesPerPR}</span>
            </div>
          </div>
        </div>

        {/* Trend visualization */}
        <div>
          <h4 className="text-base font-medium mb-3">
            Activity Trend by {timeUnit}
          </h4>
          <div className="h-56">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval={timeUnit === "day" ? 2 : 0}
                  />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine
                    y={avgPRs}
                    stroke="#666"
                    strokeDasharray="3 3"
                    label={{ value: "Avg PRs", position: "insideBottomRight" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="prs"
                    stroke="#3b82f6" // Blue
                    activeDot={{ r: 8 }}
                    name={`PRs per ${timeUnit}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="commits"
                    stroke="#22c55e" // Green
                    name={`Commits per ${timeUnit}`}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <span className="text-gray-500">
                  Not enough data for trend analysis
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>
              <span className="inline-block w-3 h-0.5 bg-blue-400 mr-1"></span>
              Average: {avgPRs.toFixed(1)} PRs per {timeUnit}
            </p>
            <p className="mt-1">
              <span className="inline-block w-3 h-0.5 bg-green-400 mr-1"></span>
              Average: {isLoadingCommits
                ? "Loading..."
                : avgCommits.toFixed(1)}{" "}
              commits per {timeUnit}
            </p>
            <p className="mt-1">
              Analysis based on {metrics.prCount} PRs ({metrics.closedPRCount}{" "}
              closed) over {timeframeDays} days
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {timeUnit === "day"
                ? "Using daily metrics (for weekly view)"
                : timeUnit === "week"
                ? "Using weekly metrics (smooths out weekend effects)"
                : "Using monthly metrics (for long-term analysis)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDateForDisplay(date: Date, timeUnit: string): string {
  if (timeUnit === "day") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else if (timeUnit === "week") {
    return `Week ${getWeekNumber(date)}`;
  } else {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  }
}
