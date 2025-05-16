import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDeveloperContext } from "../contexts/DeveloperContext";
import { useAuth } from "../lib/auth";
import { isImportantPR } from "../lib/prUtils";
import { PullRequestItem } from "../lib/types";
import { useDeveloperPerformance } from "../lib/useGitHubService";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import { FilterToggle } from "./FilterToggle";
import { SearchForm } from "./SearchForm";
import { Timeframe } from "./TimeframeSelector";
import UnauthenticatedView from "./UnauthenticatedView";
import ScrollToTop from "./ui/ScrollToTop";

// Lazy load heavy components
const Timeline = lazy(() =>
  import("./Timeline").then((module) => ({ default: module.Timeline }))
);
const CodeQualityInsights = lazy(() =>
  import("./CodeQualityInsights").then((module) => ({
    default: module.CodeQualityInsights,
  }))
);
const ActivityCharts = lazy(() =>
  import("./ActivityCharts").then((module) => ({
    default: module.ActivityCharts,
  }))
);
const KeyMetrics = lazy(() =>
  import("./KeyMetrics").then((module) => ({ default: module.KeyMetrics }))
);

// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-6 flex items-center justify-center h-64">
    <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
  </div>
);

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

          {/* Empty State - No PRs found */}
          {allPRs.length === 0 && (
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-8 text-center my-12">
              <div className="inline-flex items-center justify-center mb-4 p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                No Pull Requests Found
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-6">
                We couldn't find any pull requests for{" "}
                <strong>{username}</strong> in the selected timeframe.
                DevInsight analyzes pull requests, not individual commits.
              </p>
              <div className="space-y-4 max-w-md mx-auto text-sm">
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/20 rounded-md p-3 text-left">
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    Suggestions:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <li>Try a longer timeframe (e.g., 3 months or 1 year)</li>
                    <li>Verify that the GitHub username is correct</li>
                    <li>
                      Make sure the user has created pull requests (not just
                      commits)
                    </li>
                    <li>Check if the user's PRs are in public repositories</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Activity Charts */}
          {filteredPRs.length > 0 && (
            <Suspense fallback={<ComponentLoader />}>
              <ActivityCharts
                pullRequests={filteredPRs}
                showOnlyImportantPRs={showOnlyImportantPRs}
                onCommitDataLoaded={(count, isLoading) => {
                  setRealCommitCount(count);
                  setIsLoadingCommits(isLoading);
                }}
              />
            </Suspense>
          )}

          {/* Key Metrics */}
          {filteredPRs.length > 0 && (
            <Suspense fallback={<ComponentLoader />}>
              <KeyMetrics
                pullRequests={filteredPRs}
                timeframe={timeframe}
                realCommitCount={realCommitCount}
                isLoadingCommits={isLoadingCommits}
              />
            </Suspense>
          )}

          {/* Two-column layout for Dashboard and Timeline */}
          {filteredPRs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
              {/* Main column (Timeline) - Takes 2/3 of the space on large screens */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                {/* Timeline View */}
                <Suspense fallback={<ComponentLoader />}>
                  <Timeline
                    pullRequests={filteredPRs}
                    timeframeLabel={timeframeLabel}
                    timeframe={timeframe}
                  />
                </Suspense>
              </div>

              {/* Side column (Code Quality Assistant) - Takes 1/3 of the space */}
              <div className="lg:col-span-1 lg:mt-0 order-1 lg:order-2">
                {/* AI Code Quality Analysis */}
                <Suspense fallback={<ComponentLoader />}>
                  <CodeQualityInsights
                    pullRequests={filteredPRs}
                    allPRs={allPRs}
                    developerId={username}
                  />
                </Suspense>
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

      {/* Show loading indicator */}
      {showData && developerData.isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Searching for pull requests...
            </p>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}

function getTimeframeLabel(timeframe: Timeframe): string {
  switch (timeframe) {
    case "1month":
      return "Past Month";
    case "3months":
      return "Past 3 Months";
    case "6months":
      return "Past 6 Months";
    case "1year":
      return "Past Year";
    default:
      return "Past Month";
  }
}
