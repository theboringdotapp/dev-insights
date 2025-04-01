import { useState, useMemo } from "react";
import { useAuth } from "../lib/auth";
import { useDeveloperPerformance } from "../lib/useGitHubService";
import { SearchForm } from "./SearchForm";
import { StatsDisplay } from "./StatsDisplay";
import { PullRequestList } from "./PullRequestList";
import { Timeframe } from "./TimeframeSelector";
import { Timeline } from "./Timeline";
import { PullRequestItem } from "../lib/types";
import { FilterToggle } from "./FilterToggle";
import { isImportantPR } from "../lib/prUtils";
import { usePRMetrics } from "../lib/usePRMetrics";

export default function DeveloperDashboard() {
  const { isAuthenticated, userProfile } = useAuth();
  const [username, setUsername] = useState(userProfile?.login || "");
  const [timeframe, setTimeframe] = useState<Timeframe>("1month");
  const [showData, setShowData] = useState(false);
  const [showOnlyImportantPRs, setShowOnlyImportantPRs] = useState(true);
  const [searchTrigger, setSearchTrigger] = useState<number | undefined>(
    undefined
  );

  // For handling PR metrics
  const { enhancePRsWithMetrics } = usePRMetrics();

  // Only fetch data when the search trigger changes
  const developerData = useDeveloperPerformance(
    username,
    undefined, // org is no longer used
    undefined, // repo is no longer used
    timeframe,
    searchTrigger
  );

  // Compute PR counts
  const { allPRs, importantPRs, filteredPRs } = useMemo(() => {
    if (!showData || developerData.isLoading || developerData.error) {
      return { allPRs: [], importantPRs: [], filteredPRs: [] };
    }

    const allPRs = developerData.pullRequests as PullRequestItem[];
    const importantPRs = allPRs.filter(isImportantPR);
    const filteredPRs = showOnlyImportantPRs ? importantPRs : allPRs;

    // We don't need to store the enhanced PRs since Timeline handles this internally
    enhancePRsWithMetrics(filteredPRs);

    return { allPRs, importantPRs, filteredPRs };
  }, [developerData, showOnlyImportantPRs, showData, enhancePRsWithMetrics]);

  const handleSearch = (newUsername: string, newTimeframe: Timeframe) => {
    setUsername(newUsername);
    setTimeframe(newTimeframe);
    // Increment the search trigger to cause a re-fetch
    setSearchTrigger((prev) => (prev === undefined ? 1 : prev + 1));
    setShowData(true);
  };

  const handleFilterChange = (showOnlyImportant: boolean) => {
    setShowOnlyImportantPRs(showOnlyImportant);
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 mb-4">
          Please log in with your GitHub token to view developer performance
          metrics.
        </p>
      </div>
    );
  }

  const timeframeLabel = getTimeframeLabel(timeframe);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">
        Developer Performance Dashboard
      </h2>

      <SearchForm
        username={username}
        initialTimeframe={timeframe}
        onSearch={handleSearch}
        isLoading={developerData.isLoading}
      />

      {developerData.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {developerData.error}
        </div>
      )}

      {showData && !developerData.isLoading && !developerData.error && (
        <div className="space-y-8">
          {/* Current timeframe indicator */}
          <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>
                Showing data for:{" "}
                <span className="font-medium">{timeframeLabel}</span>
              </span>

              {/* PR Filter Toggle */}
              <FilterToggle
                showOnlyImportantPRs={showOnlyImportantPRs}
                onChange={handleFilterChange}
                importantCount={importantPRs.length}
                totalCount={allPRs.length}
              />
            </div>
          </div>

          {/* Stats Summary */}
          {developerData.stats && <StatsDisplay stats={developerData.stats} />}

          {/* No PRs after filtering message */}
          {allPRs.length > 0 && filteredPRs.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
              No important PRs (feat/fix) found in the selected timeframe.
              Toggle the filter to see all PRs.
            </div>
          )}

          {/* Metrics note */}
          {filteredPRs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
              <p className="font-medium">PR Metrics</p>
              <p className="text-sm mt-1">
                Click "Load metrics" on any PR to see additional data like
                change requests and PR duration. Data is loaded on-demand to
                minimize API requests.
              </p>
            </div>
          )}

          {/* Pull Requests */}
          {filteredPRs.length > 0 && (
            <>
              <PullRequestList
                pullRequests={filteredPRs}
                timeframeLabel={timeframeLabel}
              />

              {/* Timeline View */}
              <Timeline
                pullRequests={filteredPRs}
                timeframeLabel={timeframeLabel}
                timeframe={timeframe}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function getTimeframeLabel(timeframe: Timeframe): string {
  switch (timeframe) {
    case "1week":
      return "Last Week";
    case "1month":
      return "Last Month";
    case "3months":
      return "Last 3 Months";
    case "6months":
      return "Last 6 Months";
    case "1year":
      return "Last Year";
    default:
      return "Timeline";
  }
}
