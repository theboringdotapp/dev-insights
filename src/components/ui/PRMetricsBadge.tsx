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
        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-0.5 px-2 rounded inline-flex items-center"
      >
        <span>Load metrics</span>
      </button>
    );
  }

  // If metrics are loading, show spinner
  if (metrics.isLoading) {
    return (
      <div className="text-xs bg-gray-100 text-gray-600 py-0.5 px-2 rounded inline-flex items-center">
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
        className="text-xs bg-red-100 hover:bg-red-200 text-red-600 py-0.5 px-2 rounded inline-flex items-center"
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
    <div className="flex space-x-2">
      {/* Duration badge */}
      <div className="text-xs bg-blue-100 text-blue-800 py-0.5 px-2 rounded inline-flex items-center">
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
      <div className="text-xs bg-amber-100 text-amber-800 py-0.5 px-2 rounded inline-flex items-center">
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
      <div className="text-xs bg-purple-100 text-purple-800 py-0.5 px-2 rounded inline-flex items-center">
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
