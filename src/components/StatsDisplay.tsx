import { DeveloperStats } from "../lib/types";

interface StatsDisplayProps {
  stats: DeveloperStats;
  filteredStats?: DeveloperStats;
  showFiltered: boolean;
  realCommitCount?: number;
  isLoadingCommits?: boolean;
}

export function StatsDisplay({
  stats,
  filteredStats,
  showFiltered,
  realCommitCount,
  isLoadingCommits = false,
}: StatsDisplayProps) {
  // Determine which stats to display
  const displayStats = showFiltered && filteredStats ? filteredStats : stats;

  // Calculate percentages for the filtered view
  const prPercentage =
    showFiltered && filteredStats
      ? Math.round(
          (filteredStats.pullRequestCount / stats.pullRequestCount) * 100
        )
      : 100;

  const reviewPercentage =
    showFiltered && filteredStats
      ? Math.round((filteredStats.reviewCount / stats.reviewCount) * 100)
      : 100;

  const commitPercentage =
    showFiltered && filteredStats && realCommitCount
      ? Math.round((filteredStats.commitCount / stats.commitCount) * 100)
      : 100;

  // Define consistent colors to match the chart
  const colors = {
    pullRequests: "text-blue-600", // Blue 500
    commits: "text-green-600", // Green 500
    reviews: "text-purple-600", // Purple 500
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className={`text-4xl font-bold ${colors.pullRequests}`}>
          {displayStats.pullRequestCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Pull Requests
          {showFiltered && filteredStats && stats.pullRequestCount > 0 && (
            <span className="ml-1 text-xs text-blue-500">
              ({prPercentage}% of {stats.pullRequestCount})
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className={`text-4xl font-bold ${colors.reviews}`}>
          {displayStats.reviewCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Code Reviews
          {showFiltered && filteredStats && stats.reviewCount > 0 && (
            <span className="ml-1 text-xs text-purple-500">
              ({reviewPercentage}% of {stats.reviewCount})
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div
          className={`text-4xl font-bold ${colors.commits} flex items-center justify-center`}
        >
          {isLoadingCommits ? (
            <svg
              className="animate-spin h-8 w-8"
              xmlns="http://www.w3.org/2000/svg"
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
          ) : (
            <>
              {realCommitCount !== undefined
                ? realCommitCount
                : displayStats.commitCount}
            </>
          )}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Commits
          {showFiltered &&
            filteredStats &&
            stats.commitCount > 0 &&
            !isLoadingCommits && (
              <span className="ml-1 text-xs text-green-500">
                ({commitPercentage}% of {stats.commitCount})
              </span>
            )}
          {isLoadingCommits && (
            <span className="ml-1 text-xs text-gray-400">
              (Analyzing PR data...)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
