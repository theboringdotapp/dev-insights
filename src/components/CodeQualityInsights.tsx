import React, { useState, useEffect, useRef } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";
import ConfigurationPanel from "./code-quality/ConfigurationPanel";
import AnalysisStatus from "./code-quality/AnalysisStatus";
import AnalysisResults from "./code-quality/AnalysisResults";
import InitialState from "./code-quality/InitialState";
import AnalysisLoadingIndicator from "./code-quality/AnalysisLoadingIndicator";
import { useAPIConfiguration } from "../hooks/useAPIConfiguration";
import cacheService from "../lib/cacheService";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  showOnlyImportantPRs?: boolean;
  onToggleFilter?: (showOnlyImportant: boolean) => void;
}

export function CodeQualityInsights({
  pullRequests,
  allPRs,
  showOnlyImportantPRs = true,
  onToggleFilter,
}: CodeQualityInsightsProps) {
  const {
    analyzeMultiplePRs,
    isAnalyzing,
    analysisSummary,
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
  } = usePRMetrics();
  const {
    apiKey,
    setApiKey,
    apiProvider,
    saveToken,
    setSaveToken,
    handleProviderChange,
    handleResetApiKey,
    saveApiKey,
  } = useAPIConfiguration();

  const [maxPRs, setMaxPRs] = useState(5);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);
  const [viewAllAnalyzedPRs, setViewAllAnalyzedPRs] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [cachedPRIds, setCachedPRIds] = useState<number[]>([]);
  const [allAnalyzedPRIds, setAllAnalyzedPRIds] = useState<number[]>([]);
  const [newlyAnalyzedPRIds, setNewlyAnalyzedPRIds] = useState<number[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // New state for selected PRs
  const [selectedPRIds, setSelectedPRIds] = useState<number[]>([]);

  // Add a ref to track if we've already auto-shown analysis
  const autoShowCompletedRef = useRef(false);

  // Check if API key exists on mount
  useEffect(() => {
    const openaiKey = localStorage.getItem(OPENAI_KEY_STORAGE);
    const anthropicKey = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
    const hasKey = !!(openaiKey || anthropicKey);
    setHasApiKey(hasKey);
    // Only show config if no keys are found
    setIsConfigVisible(!hasKey);
  }, []);

  // Determine which PRs to analyze
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // Check how many PRs already have analysis (both top N and all PRs)
  useEffect(() => {
    // Skip if analysis is already being shown or if we've already auto-shown it
    if (
      prsToAnalyze.length === 0 ||
      analysisSummary ||
      autoShowCompletedRef.current
    )
      return;

    const checkCachedCount = async () => {
      let count = 0;
      const cachedIds: number[] = [];
      const allIds: number[] = [];

      // First check top N PRs for cache status
      for (const pr of prsToAnalyze.slice(0, maxPRs)) {
        const isAnalyzed = await getAnalysisForPR(pr.id);
        if (isAnalyzed) {
          count++;
          cachedIds.push(pr.id);
          allIds.push(pr.id);
        }
      }

      // Then check all PRs for any that are analyzed
      for (const pr of prsToAnalyze.slice(maxPRs)) {
        const isAnalyzed = await getAnalysisForPR(pr.id);
        if (isAnalyzed) {
          allIds.push(pr.id);
        }
      }

      setCachedCount(count);
      setCachedPRIds(cachedIds);
      setAllAnalyzedPRIds(allIds);

      // Only set selectedPRIds if it's empty (initial load)
      if (selectedPRIds.length === 0) {
        setSelectedPRIds(allIds);
      }

      // Auto-show analysis if we have cached PRs and haven't already shown it
      if (allIds.length > 0 && hasApiKey && !autoShowCompletedRef.current) {
        const config: AIAnalysisConfig = {
          apiKey:
            apiKey ||
            localStorage.getItem(OPENAI_KEY_STORAGE) ||
            localStorage.getItem(ANTHROPIC_KEY_STORAGE) ||
            "",
          provider: apiProvider,
        };

        // Get the PR objects for all cached PRs
        const analyzedPRs = prsToAnalyze.filter((pr) => allIds.includes(pr.id));

        if (analyzedPRs.length > 0) {
          // Mark that we've auto-shown the analysis to prevent recurring calls
          autoShowCompletedRef.current = true;

          // Show cached analyses without making new API calls
          analyzeMultiplePRs(analyzedPRs, config, 0);
        }
      }
    };

    checkCachedCount();
  }, [
    prsToAnalyze,
    maxPRs,
    getAnalysisForPR,
    refreshTrigger,
    hasApiKey,
    apiKey,
    apiProvider,
    analysisSummary,
  ]);

  // Reset auto-show flag when the component unmounts
  useEffect(() => {
    return () => {
      autoShowCompletedRef.current = false;
    };
  }, []);

  // Refresh analyses when view mode changes
  useEffect(() => {
    if (analysisSummary) {
      // Force refresh analysis to update displayed PRs
      handleRefreshAnalysis();
    }
  }, [viewAllAnalyzedPRs]);

  // Function to refresh analysis based on current view mode
  const handleRefreshAnalysis = async () => {
    if (!hasApiKey && !apiKey) return;

    const config: AIAnalysisConfig = {
      apiKey:
        apiKey ||
        localStorage.getItem(OPENAI_KEY_STORAGE) ||
        localStorage.getItem(ANTHROPIC_KEY_STORAGE) ||
        "",
      provider: apiProvider,
    };

    // We don't need to re-analyze, just fetch all cached analyses
    const targetPRIds = viewAllAnalyzedPRs
      ? allAnalyzedPRIds
      : cachedPRIds.concat(newlyAnalyzedPRIds);

    // Filter to only get PRs that exist in our current list
    const targetPRs = prsToAnalyze.filter((pr) => targetPRIds.includes(pr.id));

    // Set a small timeout to allow state updates to propagate
    setTimeout(() => {
      // Trigger the analysis operation with 0 max PRs to just refresh the UI without new API calls
      analyzeMultiplePRs(targetPRs, config, 0);
    }, 100);

    // Also trigger a refresh check for any new analyses
    setRefreshTrigger((prev) => prev + 1);
  };

  // Subscribe to Timeline PR analysis changes
  useEffect(() => {
    // Set up an interval to check for newly analyzed PRs from Timeline
    const intervalId = setInterval(async () => {
      // Only check for updates if we're not currently analyzing
      if (isAnalyzing) return;

      // Check if any PRs in our list have been newly analyzed
      let hasNewAnalysis = false;
      const newIds: number[] = [];

      for (const pr of prsToAnalyze) {
        // Skip if already known to be analyzed
        if (allAnalyzedPRIds.includes(pr.id)) continue;

        // Check memory cache first (faster)
        let isAnalyzed = !!getAnalysisFromMemoryCache(pr.id);

        // If not in memory, check persistent cache
        if (!isAnalyzed) {
          isAnalyzed = !!(await getAnalysisForPR(pr.id));
        }

        if (isAnalyzed) {
          hasNewAnalysis = true;
          newIds.push(pr.id);
        }
      }

      // If new analyses found, update allAnalyzedPRIds directly instead of
      // triggering a full refresh which causes flickering
      if (hasNewAnalysis && newIds.length > 0) {
        setAllAnalyzedPRIds((prev) => {
          const uniqueIds = new Set([...prev, ...newIds]);
          return Array.from(uniqueIds);
        });

        // Only trigger refresh if we're already displaying results
        if (analysisSummary) {
          setRefreshTrigger((prev) => prev + 1);
        }
      }
    }, 5000); // Increase check interval from 2s to 5s to reduce frequency

    return () => clearInterval(intervalId);
  }, [
    prsToAnalyze,
    allAnalyzedPRIds,
    getAnalysisFromMemoryCache,
    getAnalysisForPR,
    isAnalyzing,
    analysisSummary,
  ]);

  // Listen for PR analysis events from Timeline
  useEffect(() => {
    const handleAnalysisStarted = () => {
      // Reset the refresh check timer
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleAnalysisCompleted = (e: Event) => {
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      if (prId) {
        // Update allAnalyzedPRIds to include this PR
        setAllAnalyzedPRIds((prev) => {
          if (prev.includes(prId)) return prev;
          return [...prev, prId];
        });

        // Update selected PRs to include this PR
        setSelectedPRIds((prev) => {
          if (prev.includes(prId)) return prev;
          return [...prev, prId];
        });

        // Always immediately show the analysis when a PR is analyzed from Timeline
        const config: AIAnalysisConfig = {
          apiKey:
            apiKey ||
            localStorage.getItem(OPENAI_KEY_STORAGE) ||
            localStorage.getItem(ANTHROPIC_KEY_STORAGE) ||
            "",
          provider: apiProvider,
        };

        // Get the PR object
        const analyzedPR = prsToAnalyze.find((pr) => pr.id === prId);

        if (analyzedPR) {
          // Immediately show the analysis for this PR
          setTimeout(() => {
            // If we already have an analysis showing, just refresh it to include this PR
            if (analysisSummary) {
              handleRefreshAnalysis();
            } else {
              // Otherwise show a new analysis for just this PR
              analyzeMultiplePRs([analyzedPR], config, 0);
            }
          }, 100);
        }
      }
    };

    // Add event listeners
    window.addEventListener("pr-analysis-started", handleAnalysisStarted);
    window.addEventListener("pr-analysis-completed", handleAnalysisCompleted);

    return () => {
      // Clean up event listeners
      window.removeEventListener("pr-analysis-started", handleAnalysisStarted);
      window.removeEventListener(
        "pr-analysis-completed",
        handleAnalysisCompleted
      );
    };
  }, [analysisSummary, viewAllAnalyzedPRs, prsToAnalyze, apiKey, apiProvider]);

  // Handle toggling a PR selection
  const handleTogglePR = (prId: number) => {
    // Update selectedPRIds
    setSelectedPRIds((prev) => {
      // Create the new selection state
      const newSelection = prev.includes(prId)
        ? prev.filter((id) => id !== prId)
        : [...prev, prId];

      // If we have an analysis already, refresh it using the new selection
      if (analysisSummary) {
        // Small delay to ensure state update happens first
        setTimeout(() => {
          const config: AIAnalysisConfig = {
            apiKey:
              apiKey ||
              localStorage.getItem(OPENAI_KEY_STORAGE) ||
              localStorage.getItem(ANTHROPIC_KEY_STORAGE) ||
              "",
            provider: apiProvider,
          };

          // Only get PRs that are now selected (based on new selection, not old selectedPRIds)
          const targetPRs = prsToAnalyze.filter((pr) =>
            newSelection.includes(pr.id)
          );

          if (targetPRs.length > 0) {
            // Refresh analysis with selected PRs
            analyzeMultiplePRs(targetPRs, config, 0);
          }
          // We no longer reload the page when no PRs are selected
          // The empty state will be shown based on selectedPRIds.length === 0
        }, 100);
      }

      return newSelection;
    });
  };

  // Handle analyze button click
  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    // Save API key if opted in
    saveApiKey();
    setHasApiKey(true);

    const config: AIAnalysisConfig = {
      apiKey,
      provider: apiProvider,
    };

    // Reset state for newly analyzed PRs
    setNewlyAnalyzedPRIds([]);

    // Store the current cached PRs before analysis
    const previouslyCachedIds = [...cachedPRIds];

    // Call analyzeMultiplePRs - it will handle cache usage
    const results = await analyzeMultiplePRs(prsToAnalyze, config, maxPRs);

    // Update all analyzed PRs
    const resultIds = results.map((r) => r.prId);
    setAllAnalyzedPRIds((prev) => {
      const uniqueIds = new Set([...prev, ...resultIds]);
      return Array.from(uniqueIds);
    });

    // Update selected PRs to include newly analyzed ones
    setSelectedPRIds((prev) => {
      const uniqueIds = new Set([...prev, ...resultIds]);
      return Array.from(uniqueIds);
    });

    // Determine which PRs were newly analyzed - only if they weren't in the initially cached list
    const newlyAnalyzed = resultIds.filter(
      (id) => !previouslyCachedIds.includes(id)
    );

    setNewlyAnalyzedPRIds(newlyAnalyzed);

    // Update filter if analyzing all PRs and not already showing all
    if (useAllPRs && showOnlyImportantPRs && onToggleFilter) {
      onToggleFilter(false);
    }
  };

  // Toggle between filtered PRs and all PRs
  const handleToggleAllPRs = () => {
    setUseAllPRs(!useAllPRs);
  };

  // Toggle between viewing only top N analyzed PRs and all analyzed PRs
  const handleToggleViewAllAnalyzed = () => {
    setViewAllAnalyzedPRs(!viewAllAnalyzedPRs);
  };

  // Handle clearing all cached PR analysis data
  const handleClearCache = async () => {
    if (isAnalyzing) return;

    // Ask for confirmation
    if (
      !window.confirm(
        "Are you sure you want to clear all cached PR analysis data? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      // Clear the cache
      await cacheService.clearAllPRAnalysis();

      // Reset states
      setCachedCount(0);
      setCachedPRIds([]);
      setAllAnalyzedPRIds([]);
      setNewlyAnalyzedPRIds([]);

      // Force a component refresh to clear the analysis display
      setRefreshTrigger((prev) => prev + 1);

      // If we have an analysis summary showing, hide it
      if (analysisSummary) {
        // We can't directly modify analysisSummary,
        // so we'll reload the page to reset the state
        window.location.reload();
      } else {
        // Show confirmation
        alert("All cached PR analysis data has been cleared.");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("Failed to clear cache. Please try again.");
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Code Quality Insights</h3>
        {hasApiKey && (
          <button
            onClick={() => setIsConfigVisible(!isConfigVisible)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isConfigVisible ? "Hide Settings" : "Show Settings"}
          </button>
        )}
      </div>

      {/* Controls for PR count and view mode */}
      {(hasApiKey || apiKey) && !isAnalyzing && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* PR Count Selector */}
          <div className="flex items-center">
            <label className="mr-2 text-sm font-medium">Analyze:</label>
            <select
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              value={maxPRs}
              onChange={(e) => setMaxPRs(Number(e.target.value))}
              disabled={isAnalyzing}
            >
              <option value="3">3 PRs</option>
              <option value="5">5 PRs</option>
              <option value="10">10 PRs</option>
              <option value="15">15 PRs</option>
            </select>
          </div>

          {/* View All Analyzed Toggle - only show if there are analyzed PRs */}
          {allAnalyzedPRIds.length > 0 && (
            <div className="flex items-center ml-4">
              <input
                type="checkbox"
                id="viewAllAnalyzed"
                checked={viewAllAnalyzedPRs}
                onChange={handleToggleViewAllAnalyzed}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="viewAllAnalyzed" className="ml-2 text-sm">
                View all analyzed PRs ({allAnalyzedPRIds.length})
              </label>
            </div>
          )}

          {/* Button to perform analysis */}
          {!analysisSummary && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !apiKey}
              className={`ml-auto px-3 py-1 rounded-md text-white text-sm ${
                isAnalyzing || !apiKey
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {cachedCount === maxPRs
                ? "Show Analysis"
                : cachedCount > 0
                ? `Analyze ${maxPRs - cachedCount} New PRs`
                : `Analyze ${maxPRs} PRs`}
            </button>
          )}
        </div>
      )}

      {/* PR Selection Component - show when we have analysis results */}
      {!isAnalyzing && analysisSummary && allAnalyzedPRIds.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Pull Requests in Analysis
          </h4>
          <div className="flex flex-wrap gap-2">
            {prsToAnalyze
              .filter((pr) => allAnalyzedPRIds.includes(pr.id))
              .map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleTogglePR(pr.id)}
                  className={`px-3 py-1 text-xs rounded-full cursor-pointer flex items-center ${
                    selectedPRIds.includes(pr.id)
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  #{pr.number} {pr.title.substring(0, 20)}
                  {pr.title.length > 20 ? "..." : ""}
                  <span
                    className={`ml-1 w-2 h-2 rounded-full ${
                      selectedPRIds.includes(pr.id)
                        ? "bg-blue-500"
                        : "bg-gray-400"
                    }`}
                  ></span>
                </div>
              ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click on a PR to toggle its inclusion in the analysis.{" "}
            {selectedPRIds.length} of {allAnalyzedPRIds.length} PRs selected.
          </p>
        </div>
      )}

      {isConfigVisible && (
        <ConfigurationPanel
          apiKey={apiKey}
          apiProvider={apiProvider}
          maxPRs={maxPRs}
          saveToken={saveToken}
          setSaveToken={setSaveToken}
          handleProviderChange={handleProviderChange}
          useAllPRs={useAllPRs}
          handleToggleAllPRs={handleToggleAllPRs}
          allPRs={allPRs}
          pullRequests={pullRequests}
          showOnlyImportantPRs={showOnlyImportantPRs}
          cachedCount={cachedCount}
          isAnalyzing={isAnalyzing}
          handleAnalyze={handleAnalyze}
          setApiKey={setApiKey}
          handleResetApiKey={handleResetApiKey}
          handleClearCache={handleClearCache}
        />
      )}

      {!hasApiKey && !apiKey && !analysisSummary && !isAnalyzing && (
        <AnalysisStatus cachedCount={cachedCount} />
      )}

      {isAnalyzing && <AnalysisLoadingIndicator />}

      {/* Show analysis results only when there are PRs selected */}
      {!isAnalyzing && analysisSummary && selectedPRIds.length > 0 && (
        <AnalysisResults
          analysisSummary={analysisSummary}
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          allAnalyzedPRIds={allAnalyzedPRIds}
        />
      )}

      {/* Empty state when analysis is available but no PRs are selected */}
      {!isAnalyzing && analysisSummary && selectedPRIds.length === 0 && (
        <div className="py-8 px-4 text-center bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-gray-400 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            No PRs Selected
          </h3>
          <p className="text-gray-500 mb-4">
            Select at least one PR above to view its analysis.
          </p>
          <button
            onClick={() => setSelectedPRIds(allAnalyzedPRIds)}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors text-sm"
          >
            Select All PRs
          </button>
        </div>
      )}

      {!hasApiKey &&
        !apiKey &&
        !isAnalyzing &&
        !analysisSummary &&
        !isConfigVisible && (
          <InitialState setIsConfigVisible={setIsConfigVisible} />
        )}
    </div>
  );
}
