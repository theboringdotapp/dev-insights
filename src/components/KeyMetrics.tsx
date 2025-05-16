import React from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { Timeframe } from "./TimeframeSelector";
import { motion } from "framer-motion";

interface KeyMetricsProps {
  pullRequests: PullRequestItem[];
  timeframe: Timeframe;
  realCommitCount: number;
  isLoadingCommits: boolean;
}

export function KeyMetrics({
  pullRequests,
  timeframe,
  realCommitCount,
  isLoadingCommits,
}: KeyMetricsProps) {
  const { getPRMetrics } = usePRMetrics();

  // Calculate time unit based on timeframe
  const timeUnit = React.useMemo(() => {
    if (timeframe === "1week") return "day";
    if (
      timeframe === "1month" ||
      timeframe === "3months" ||
      timeframe === "6months"
    )
      return "week";
    return "month";
  }, [timeframe]);

  // Calculate metrics for the specified timeframe
  const metrics = React.useMemo(() => {
    if (!pullRequests.length) return null;

    // Calculate time period counts
    let timeUnitCount = 1; // Default to avoid division by zero
    const timeframeDays = getTimeframeDays(timeframe);

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

    // Calculate commits per PR
    const commitsPerPR = isLoadingCommits
      ? null
      : (realCommitCount / Math.max(1, prCount)).toFixed(1);

    // Calculate PR velocity and change request metrics
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
      closedPRCount > 0 ? (totalDurationDays / closedPRCount).toFixed(1) : null;

    // Calculate average changes per PR that had changes
    const avgChangesPerPR =
      prsWithChangeRequests > 0
        ? (changeRequestCount / prsWithChangeRequests).toFixed(1)
        : "0";

    return {
      prsPerTimeUnit,
      commitsPerPR,
      avgDaysToClose,
      avgChangesPerPR,
      closedPRCount,
      prCount,
    };
  }, [
    pullRequests,
    timeUnit,
    timeframe,
    realCommitCount,
    isLoadingCommits,
    getPRMetrics,
  ]);

  if (!pullRequests.length || !metrics) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500 shadow-sm">
        No data available for performance analysis.
      </div>
    );
  }

  // Helper function to render loading state or value
  const renderValue = (value: string | null, suffix: string = "") => {
    if (value === null && isLoadingCommits) {
      return <span className="text-gray-400">Loading...</span>;
    }
    return (
      <span>
        {value || "0"}
        {suffix}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Key Performance Metrics
      </h3>

      <div className="grid grid-cols-2 gap-5">
        {/* PRs per week */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="text-sm text-gray-600 mb-1">PRs per {timeUnit}</div>
          <div className="text-3xl font-semibold text-purple-700">
            {renderValue(metrics.prsPerTimeUnit)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Based on {metrics.prCount} PRs
          </div>
        </motion.div>

        {/* Average days to close */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="text-sm text-gray-600 mb-1">
            Avg. days to close PR
          </div>
          <div className="text-3xl font-semibold text-purple-700">
            {renderValue(metrics.avgDaysToClose)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            From {metrics.closedPRCount} closed PRs
          </div>
        </motion.div>

        {/* Commits per PR */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="text-sm text-gray-600 mb-1">Commits per PR</div>
          <div className="text-3xl font-semibold text-purple-700">
            {renderValue(metrics.commitsPerPR)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            From PR-based commit data
          </div>
        </motion.div>

        {/* Change requests */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="text-sm text-gray-600 mb-1">Avg. change requests</div>
          <div className="text-3xl font-semibold text-purple-700">
            {renderValue(metrics.avgChangesPerPR)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Per PR needing changes
          </div>
        </motion.div>
      </div>

      <div className="text-xs text-gray-500 border-t border-gray-100 mt-6 pt-4">
        All metrics are calculated based on PR data only. Direct commits to
        branches without PRs are not included.
      </div>
    </motion.div>
  );
}

// Helper function to get timeframe days
function getTimeframeDays(timeframe: Timeframe): number {
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
}
