import { DeveloperStats } from "../lib/types";

interface StatsDisplayProps {
  stats: DeveloperStats;
  filteredStats?: DeveloperStats;
  showFiltered: boolean;
}

export function StatsDisplay({
  stats,
  filteredStats,
  showFiltered,
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
    showFiltered && filteredStats
      ? Math.round((filteredStats.commitCount / stats.commitCount) * 100)
      : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="text-4xl font-bold text-blue-600">
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
        <div className="text-4xl font-bold text-green-600">
          {displayStats.reviewCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Code Reviews
          {showFiltered && filteredStats && stats.reviewCount > 0 && (
            <span className="ml-1 text-xs text-green-500">
              ({reviewPercentage}% of {stats.reviewCount})
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="text-4xl font-bold text-purple-600">
          {displayStats.commitCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Commits
          {showFiltered && filteredStats && stats.commitCount > 0 && (
            <span className="ml-1 text-xs text-purple-500">
              ({commitPercentage}% of {stats.commitCount})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
