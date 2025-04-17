import React from "react";
import { PullRequestMetrics } from "../../lib/types";

interface PRMetricsBadgeProps {
  metrics?: PullRequestMetrics;
  onClick?: () => void;
}

export function PRMetricsBadge({ metrics, onClick }: PRMetricsBadgeProps) {
  // If no metrics provided, show button to load them
  if (!metrics) {
    return (
      <button
        onClick={onClick}
        className="text-xs border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 py-0.5 px-2.5 rounded-full inline-flex items-center transition-colors"
      >
        <span>Load metrics</span>
      </button>
    );
  }

  // If metrics are loading, show spinner
  if (metrics.isLoading) {
    return (
      <div className="text-xs border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 py-0.5 px-2.5 rounded-full inline-flex items-center">
        <svg
          className="animate-spin h-3 w-3 mr-1 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Loading...</span>
      </div>
    );
  }

  // If there was an error loading metrics
  if (metrics.error) {
    return (
      <button
        onClick={onClick}
        className="text-xs border border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/60 py-0.5 px-2.5 rounded-full inline-flex items-center transition-colors"
      >
        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <span>Retry</span>
      </button>
    );
  }

  // Display the metrics
  return (
    // Wrap badges on mobile, space out on larger screens
    <div className="flex flex-wrap gap-2 sm:space-x-2">
      {/* Duration badge */}
      <div className="text-xs border border-blue-300 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 py-0.5 px-2.5 rounded-full inline-flex items-center">
        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          {metrics.durationInDays}{" "}
          {metrics.durationInDays === 1 ? "day" : "days"}
        </span>
      </div>

      {/* Change requests badge */}
      <div
        className={`text-xs border py-0.5 px-2.5 rounded-full inline-flex items-center ${
          metrics.changeRequestCount === 0
            ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700"
            : metrics.changeRequestCount <= 2
            ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700"
            : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700"
        }`}
      >
        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          {metrics.changeRequestCount}{" "}
          {metrics.changeRequestCount === 1 ? "change" : "changes"}
        </span>
      </div>

      {/* Comment count badge */}
      <div className="text-xs border border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 py-0.5 px-2.5 rounded-full inline-flex items-center">
        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          {metrics.commentCount}{" "}
          {metrics.commentCount === 1 ? "comment" : "comments"}
        </span>
      </div>
    </div>
  );
}
