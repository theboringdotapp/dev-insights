import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useDeveloperPerformance } from "../lib/useGitHubService";
import { SearchForm } from "./SearchForm";
import { Timeframe } from "./TimeframeSelector";
import { Timeline } from "./Timeline";
import { PullRequestItem } from "../lib/types";
import { FilterToggle } from "./FilterToggle";
import { isImportantPR } from "../lib/prUtils";
import { usePRMetrics } from "../lib/usePRMetrics";
import { ActivityCharts } from "./ActivityCharts";
import { KeyMetrics } from "./KeyMetrics";
import { CodeQualityInsights } from "./CodeQualityInsights";
import { useSearchParams } from "react-router-dom";
import UnauthenticatedView from "./UnauthenticatedView";
import ScrollToTop from "./ui/ScrollToTop";
import { useDeveloperContext } from "../contexts/DeveloperContext";
import { useAnalysisStore } from "../stores/analysisStore";

export default function DeveloperDashboard() {
  const { isAuthenticated, userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setDeveloperId } = useDeveloperContext();
  const { clearAnalysisData } = useAnalysisStore();

  // Get username from URL or default to user profile
  const usernameFromUrl = searchParams.get("username");
  const [username, setUsername] = useState(
    usernameFromUrl || userProfile?.login || ""
  );
  const [timeframe, setTimeframe] = useState<Timeframe>("1month");
  const [showData, setShowData] = useState(!!usernameFromUrl);
  const [showOnlyImportantPRs, setShowOnlyImportantPRs] = useState(true);
  const [searchTrigger, setSearchTrigger] = useState<number | undefined>(
    usernameFromUrl ? 1 : undefined
  );

  // State for real commit data from PR metrics
  const [realCommitCount, setRealCommitCount] = useState(0);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);

  // Use a ref to track when a search is already in progress to prevent URL listener cycles
  const isHandlingSearchRef = useRef(false);

  // For handling PR metrics
  const { enhancePRsWithMetrics } = usePRMetrics();

  // Update document title when username changes
  useEffect(() => {
    if (username && showData) {
      document.title = `DevInsight - ${username}`;
    } else {
      document.title = "DevInsight";
    }
  }, [username, showData]);

  // Reset stats when developer ID changes
  useEffect(() => {
    if (usernameFromUrl && usernameFromUrl !== username) {
      // Reset commit stats to avoid showing previous user's data while loading
      setRealCommitCount(0);
      setIsLoadingCommits(false);
    }
  }, [usernameFromUrl, username]);

  // Listen for URL parameter changes and update search
  useEffect(() => {
    // Skip if we're already handling a search to prevent cycles
    if (isHandlingSearchRef.current) {
      console.log(
        `[DeveloperDashboard] Ignoring URL change during active search`
      );
      return;
    }

    if (usernameFromUrl && usernameFromUrl !== username) {
      console.log(
        `[DeveloperDashboard] URL changed to user: ${usernameFromUrl} (previous: ${username})`
      );
      setUsername(usernameFromUrl);
      setDeveloperId(usernameFromUrl); // Update developer context
      setSearchTrigger((prev) => (prev === undefined ? 1 : prev + 1));
      setShowData(true);
      clearAnalysisData(); // Clear analysis data when switching users via URL
    }
  }, [usernameFromUrl, username, setDeveloperId, clearAnalysisData]);

  // Auto-trigger search if username is in URL
  useEffect(() => {
    if (usernameFromUrl && searchTrigger === 1) {
      setShowData(true);
    }
  }, [usernameFromUrl, searchTrigger]);

  // Only fetch data when the search trigger changes
  const developerData = useDeveloperPerformance(
    username,
    undefined, // org is no longer used
    undefined, // repo is no longer used
    timeframe,
    searchTrigger
  );

  // Compute PR counts and filtered stats
  const { allPRs, importantPRs, filteredPRs } = useMemo(() => {
    if (!showData || developerData.isLoading || developerData.error) {
      return {
        allPRs: [],
        importantPRs: [],
        filteredPRs: [],
      };
    }

    const allPRs = developerData.pullRequests as PullRequestItem[];
    const importantPRs = allPRs.filter(isImportantPR);
    const filteredPRs = showOnlyImportantPRs ? importantPRs : allPRs;

    // We don't need to store the enhanced PRs since Timeline handles this internally
    enhancePRsWithMetrics(filteredPRs);

    return { allPRs, importantPRs, filteredPRs };
  }, [developerData, showOnlyImportantPRs, showData, enhancePRsWithMetrics]);

  const handleSearch = (newUsername: string, newTimeframe: Timeframe) => {
    console.log(
      `[DeveloperDashboard] Search triggered for: ${newUsername} (current: ${username})`
    );

    try {
      // Set flag to prevent the URL effect from reacting while we're handling search
      isHandlingSearchRef.current = true;

      // Only update if username is actually changing
      if (newUsername !== username) {
        clearAnalysisData();
        setDeveloperId(newUsername);
        setUsername(newUsername);

        // Reset commit stats to avoid showing previous user's data
        setRealCommitCount(0);
        setIsLoadingCommits(false);

        // Update URL with the username
        setSearchParams({ username: newUsername });
      } else if (newTimeframe !== timeframe) {
        // If only timeframe changed
        setTimeframe(newTimeframe);
      }

      // Increment the search trigger to cause a re-fetch
      setSearchTrigger((prev) => (prev === undefined ? 1 : prev + 1));
      setShowData(true);
    } finally {
      // Always reset the flag after a short delay to ensure that React batch updates complete first
      setTimeout(() => {
        isHandlingSearchRef.current = false;
      }, 100);
    }
  };

  const handleFilterChange = (showOnlyImportant: boolean) => {
    setShowOnlyImportantPRs(showOnlyImportant);
  };

  if (!isAuthenticated) {
    return <UnauthenticatedView />;
  }

  const timeframeLabel = getTimeframeLabel(timeframe);

  return (
    <div className="bg-card rounded-lg p-4 sm:p-6">
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

          {/* Activity Charts and Key Metrics Side by Side */}
          {filteredPRs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Activity Charts - Takes 2/3 of the space on large screens */}
              <div className="lg:col-span-2">
                <ActivityCharts
                  pullRequests={filteredPRs}
                  showOnlyImportantPRs={showOnlyImportantPRs}
                  onCommitDataLoaded={(count, isLoading) => {
                    setRealCommitCount(count);
                    setIsLoadingCommits(isLoading);
                  }}
                />
              </div>

              {/* Key Metrics - Takes 1/3 of the space */}
              <div className="lg:col-span-1">
                <KeyMetrics
                  pullRequests={filteredPRs}
                  timeframe={timeframe}
                  realCommitCount={realCommitCount}
                  isLoadingCommits={isLoadingCommits}
                />
              </div>
            </div>
          )}

          {/* Two-column layout for Dashboard and Timeline */}
          {filteredPRs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
              {/* Main column (Timeline) - Takes 2/3 of the space on large screens */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                {/* Timeline View */}
                <Timeline
                  pullRequests={filteredPRs}
                  timeframeLabel={timeframeLabel}
                  timeframe={timeframe}
                />
              </div>

              {/* Side column (Code Quality Assistant) - Takes 1/3 of the space */}
              <div className="lg:col-span-1 lg:mt-0 order-1 lg:order-2">
                {/* AI Code Quality Analysis */}
                <CodeQualityInsights
                  pullRequests={filteredPRs}
                  allPRs={allPRs}
                  developerId={username}
                />
              </div>
            </div>
          ) : allPRs.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
              No important PRs (feat/fix) found in the selected timeframe.
              Toggle the filter to see all PRs.
            </div>
          ) : null}
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}

// Helper functions
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
