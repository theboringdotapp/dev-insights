import { useState, useMemo } from "react";
import { useAuth } from "../lib/auth";
import { useDeveloperPerformance } from "../lib/useGitHubService";
import { SearchForm } from "./SearchForm";
import { StatsDisplay } from "./StatsDisplay";
import { Timeframe } from "./TimeframeSelector";
import { Timeline } from "./Timeline";
import { PullRequestItem, DeveloperStats } from "../lib/types";
import { FilterToggle } from "./FilterToggle";
import { isImportantPR } from "../lib/prUtils";
import { usePRMetrics } from "../lib/usePRMetrics";
import { ActivityCharts } from "./ActivityCharts";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { CodeQualityInsights } from "./CodeQualityInsights";

export default function DeveloperDashboard() {
  const { isAuthenticated, userProfile } = useAuth();
  const [username, setUsername] = useState(userProfile?.login || "");
  const [timeframe, setTimeframe] = useState<Timeframe>("1month");
  const [showData, setShowData] = useState(false);
  const [showOnlyImportantPRs, setShowOnlyImportantPRs] = useState(true);
  const [searchTrigger, setSearchTrigger] = useState<number | undefined>(
    undefined
  );

  // State for real commit data from PR metrics
  const [realCommitCount, setRealCommitCount] = useState(0);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);

  // For handling PR metrics
  const { enhancePRsWithMetrics, calculateFilteredStats } = usePRMetrics();

  // Only fetch data when the search trigger changes
  const developerData = useDeveloperPerformance(
    username,
    undefined, // org is no longer used
    undefined, // repo is no longer used
    timeframe,
    searchTrigger
  );

  // Compute PR counts and filtered stats
  const { allPRs, importantPRs, filteredPRs, filteredStats } = useMemo(() => {
    if (!showData || developerData.isLoading || developerData.error) {
      return {
        allPRs: [],
        importantPRs: [],
        filteredPRs: [],
        filteredStats: null,
      };
    }

    const allPRs = developerData.pullRequests as PullRequestItem[];
    const importantPRs = allPRs.filter(isImportantPR);
    const filteredPRs = showOnlyImportantPRs ? importantPRs : allPRs;

    // Calculate filtered stats when showing only important PRs
    let filteredStats: DeveloperStats | null = null;
    if (
      developerData.stats &&
      importantPRs.length > 0 &&
      importantPRs.length < allPRs.length
    ) {
      filteredStats = calculateFilteredStats(importantPRs, developerData.stats);
    }

    // We don't need to store the enhanced PRs since Timeline handles this internally
    enhancePRsWithMetrics(filteredPRs);

    return { allPRs, importantPRs, filteredPRs, filteredStats };
  }, [
    developerData,
    showOnlyImportantPRs,
    showData,
    enhancePRsWithMetrics,
    calculateFilteredStats,
  ]);

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
      <div className="bg-card rounded-lg shadow p-6 text-center">
        <p className="text-foreground mb-4">
          Please log in with your GitHub token to view developer performance
          metrics.
        </p>
      </div>
    );
  }

  const timeframeLabel = getTimeframeLabel(timeframe);

  return (
    <div className="bg-card rounded-lg shadow p-6">
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
          <div className="bg-muted p-3 rounded-md text-sm">
            <div className="flex justify-between items-center">
              <span className="text-foreground">
                Showing data for:{" "}
                <span className="font-medium text-foreground">
                  {timeframeLabel}
                </span>
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
          {developerData.stats && (
            <StatsDisplay
              stats={developerData.stats}
              filteredStats={filteredStats}
              showFiltered={showOnlyImportantPRs}
              realCommitCount={realCommitCount}
              isLoadingCommits={isLoadingCommits}
            />
          )}

          {/* Activity Charts */}
          {filteredPRs.length > 0 && (
            <ActivityCharts
              pullRequests={filteredPRs}
              showOnlyImportantPRs={showOnlyImportantPRs}
              onCommitDataLoaded={(count, isLoading) => {
                setRealCommitCount(count);
                setIsLoadingCommits(isLoading);
              }}
            />
          )}

          {/* Performance Metrics */}
          {filteredPRs.length > 0 && (
            <PerformanceMetrics
              pullRequests={filteredPRs}
              timeframe={timeframe}
              realCommitCount={realCommitCount}
              isLoadingCommits={isLoadingCommits}
            />
          )}

          {/* AI Code Quality Analysis */}
          {filteredPRs.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Code Quality Analysis
              </h3>
              <CodeQualityInsights
                pullRequests={filteredPRs}
                allPRs={allPRs}
                showOnlyImportantPRs={showOnlyImportantPRs}
                onToggleFilter={handleFilterChange}
              />
            </div>
          )}

          {/* No PRs after filtering message */}
          {allPRs.length > 0 && filteredPRs.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
              No important PRs (feat/fix) found in the selected timeframe.
              Toggle the filter to see all PRs.
            </div>
          )}

          {/* Pull Requests */}
          {filteredPRs.length > 0 && (
            <>
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
