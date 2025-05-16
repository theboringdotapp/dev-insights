import React, { useEffect, useState } from "react";
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

// Define interface for calculated metrics
interface CalculatedMetrics {
  prsPerTimeUnit: string;
  commitsPerPR: string;
  avgDaysToClose: string;
  avgChangesPerPR: string;
  closedPRCount: number;
  prCount: number;
}

export function KeyMetrics({
  pullRequests,
  timeframe,
  realCommitCount,
  isLoadingCommits,
}: KeyMetricsProps) {
  const { getPRMetrics, loadPRMetrics, metricsCache } = usePRMetrics();
  const [isLoadingChangeRequests, setIsLoadingChangeRequests] = useState(false);
  const [calculatedMetrics, setCalculatedMetrics] =
    useState<CalculatedMetrics | null>(null);

  // This effect loads the PR metrics from GitHub when needed
  useEffect(() => {
    if (!pullRequests.length) return;

    // Check if we need to load any PR metrics
    const hasUnloadedPRs = pullRequests.some(
      (pr) =>
        !metricsCache[pr.id] ||
        (!metricsCache[pr.id].isLoaded && !metricsCache[pr.id].isLoading)
    );

    if (hasUnloadedPRs) {
      setIsLoadingChangeRequests(true);

      const unloadedPRs = pullRequests.filter(
        (pr) =>
          !metricsCache[pr.id] ||
          (!metricsCache[pr.id].isLoaded && !metricsCache[pr.id].isLoading)
      );

      // Create an array of promises for loading PR metrics
      const loadPromises = unloadedPRs.map((pr) => loadPRMetrics(pr));

      // Once all metrics are loaded, update loading state
      Promise.all(loadPromises).finally(() => {
        setIsLoadingChangeRequests(false);
      });
    } else {
      setIsLoadingChangeRequests(false);
    }
  }, [pullRequests, metricsCache, loadPRMetrics]);

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

  // Calculate metrics whenever PR data changes or loading state changes
  useEffect(() => {
    if (!pullRequests.length) return;

    // Check if any metrics are still loading
    const anyMetricsLoading = pullRequests.some(
      (pr) => metricsCache[pr.id]?.isLoading
    );

    // If metrics are loading or we're loading commits, wait
    if (anyMetricsLoading || isLoadingChangeRequests || isLoadingCommits) {
      return;
    }

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
    const commitsPerPR = (realCommitCount / Math.max(1, prCount)).toFixed(1);

    // Calculate PR velocity and change request metrics
    let closedPRCount = 0;
    let totalDurationDays = 0;
    let changeRequestCount = 0;

    // Collect PR metrics from all loaded PRs
    const loadedPRs = pullRequests
      .map((pr) => {
        const metrics = getPRMetrics(pr);
        return { pr, metrics };
      })
      .filter((item) => item.metrics?.isLoaded);

    // Reset counters
    closedPRCount = 0;
    totalDurationDays = 0;
    changeRequestCount = 0;

    // Process all loaded PRs
    loadedPRs.forEach(({ pr, metrics }) => {
      if (pr.closed_at) {
        closedPRCount++;

        if (metrics?.durationInDays) {
          totalDurationDays += metrics.durationInDays;
        } else {
          const created = new Date(pr.created_at).getTime();
          const closed = new Date(pr.closed_at).getTime();
          totalDurationDays += Math.round(
            (closed - created) / (1000 * 60 * 60 * 24)
          );
        }

        // Count change requests for closed PRs only
        if (typeof metrics?.changeRequestCount === "number") {
          changeRequestCount += metrics.changeRequestCount;
        }
      }
    });

    // Calculate average days to close
    const avgDaysToClose =
      closedPRCount > 0 ? (totalDurationDays / closedPRCount).toFixed(1) : "0";

    // Calculate average changes per PR across all closed PRs
    const avgChangesPerPR =
      closedPRCount > 0 ? (changeRequestCount / closedPRCount).toFixed(1) : "0";

    // Store calculated metrics
    setCalculatedMetrics({
      prsPerTimeUnit,
      commitsPerPR,
      avgDaysToClose,
      avgChangesPerPR,
      closedPRCount,
      prCount,
    });
  }, [
    pullRequests,
    timeUnit,
    timeframe,
    realCommitCount,
    isLoadingCommits,
    isLoadingChangeRequests,
    getPRMetrics,
    metricsCache,
  ]);

  // Loading state for entire metrics component
  const isLoading =
    isLoadingCommits ||
    isLoadingChangeRequests ||
    pullRequests.some((pr) => metricsCache[pr.id]?.isLoading) ||
    !calculatedMetrics;

  if (!pullRequests.length) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
        No data available for performance analysis.
      </div>
    );
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white p-6 rounded-xl border border-gray-200 h-full"
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-6 text-left">
          Key Performance Metrics
        </h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          Loading metrics...
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white p-6 rounded-xl border border-gray-200 h-full"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-6 text-left">
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
            {calculatedMetrics.prsPerTimeUnit}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Based on {calculatedMetrics.prCount} PRs
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
            {calculatedMetrics.avgDaysToClose}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            From {calculatedMetrics.closedPRCount} closed PRs
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
            {calculatedMetrics.commitsPerPR}
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
            {calculatedMetrics.avgChangesPerPR}
          </div>
          <div className="text-xs text-gray-500 mt-2">Per closed PR</div>
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
