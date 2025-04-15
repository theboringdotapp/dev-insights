import React, { useState, useEffect, useRef } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAPIConfiguration } from "../hooks/useAPIConfiguration";
import { usePRCache } from "./code-quality/hooks/usePRCache";
import { usePRSelection } from "./code-quality/hooks/usePRSelection";
import ConfigurationPanel from "./code-quality/ConfigurationPanel";
import AnalysisStatus from "./code-quality/AnalysisStatus";
import AnalysisResults from "./code-quality/AnalysisResults";
import InitialState from "./code-quality/InitialState";
import AnalysisLoadingIndicator from "./code-quality/AnalysisLoadingIndicator";
import PRSelectionPanel from "./code-quality/components/PRSelectionPanel";
import AnalysisControls from "./code-quality/components/AnalysisControls";
import EmptySelectionState from "./code-quality/components/EmptySelectionState";
import NoAnalyzedPRsState from "./code-quality/components/NoAnalyzedPRsState";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  showOnlyImportantPRs?: boolean;
  onToggleFilter?: (showOnlyImportant: boolean) => void;
}

/**
 * CodeQualityInsights component provides AI-based analysis of PRs
 * to identify code quality patterns, strengths, and weaknesses.
 */
export function CodeQualityInsights({
  pullRequests,
  allPRs,
  showOnlyImportantPRs = true,
  onToggleFilter,
}: CodeQualityInsightsProps) {
  // Core metrics and analysis hooks
  const {
    analyzeMultiplePRs,
    isAnalyzing,
    analysisSummary,
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
  } = usePRMetrics();

  // API configuration hook
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

  // Component state
  const [maxPRs, setMaxPRs] = useState(5);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);
  const [viewAllAnalyzedPRs, setViewAllAnalyzedPRs] = useState(false);

  // Use a ref for loading state to prevent render flickers
  const loadingStateRef = useRef(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  // Single source of truth for loading state
  const isLoading = isAnalyzing || isLocalLoading;

  // Add state to track which PRs are currently loading
  const [loadingPRIds, setLoadingPRIds] = useState<number[]>([]);

  // Determine which PRs to analyze based on filters
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // PR cache management
  const {
    cachedCount,
    cachedPRIds,
    allAnalyzedPRIds,
    setAllAnalyzedPRIds,
    newlyAnalyzedPRIds,
    setNewlyAnalyzedPRIds,
    setRefreshTrigger,
    autoShowCompletedRef,
    checkCachedAnalyses,
    autoShowAnalysis,
    clearAnalysisCache,
    createConfig,
  } = usePRCache(
    prsToAnalyze,
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
    analyzeMultiplePRs,
    isLoading,
    analysisSummary,
    apiProvider,
    apiKey
  );

  // PR selection management
  const { selectedPRIds, setSelectedPRIds, togglePR, selectAllPRs } =
    usePRSelection(
      prsToAnalyze,
      allAnalyzedPRIds,
      analyzeMultiplePRs,
      analysisSummary,
      createConfig
    );

  // Check if API key exists on mount
  useEffect(() => {
    const openaiKey = localStorage.getItem(OPENAI_KEY_STORAGE);
    const anthropicKey = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
    const hasKey = !!(openaiKey || anthropicKey);
    setHasApiKey(hasKey);
    // Only show config if no keys are found
    setIsConfigVisible(!hasKey);
  }, []);

  // Improved cache check and auto-show logic - combined into one effect
  // with better loading state management
  useEffect(() => {
    // Skip if we have no PRs to analyze, already showing analysis, or if we're already analyzing
    if (
      prsToAnalyze.length === 0 ||
      analysisSummary ||
      isLoading ||
      autoShowCompletedRef.current
    ) {
      return;
    }

    const fetchCachedAnalyses = async () => {
      // Use ref to track loading state without triggering rerenders
      if (loadingStateRef.current) return;

      try {
        // First check if there are cached PRs without updating component state or showing loading
        const initialCheck = await checkCachedAnalyses(maxPRs, hasApiKey, true);

        // Only proceed with loading and showing analysis if we actually have cached PRs
        if (initialCheck && initialCheck.allIds.length > 0 && hasApiKey) {
          // Now set loading state since we know we have PRs to show
          loadingStateRef.current = true;
          setIsLocalLoading(true);

          // Get the PR objects for all cached PRs
          const analyzedPRs = prsToAnalyze.filter((pr) =>
            initialCheck.allIds.includes(pr.id)
          );

          if (analyzedPRs.length > 0) {
            // Now update component state with the cached PRs we found
            await checkCachedAnalyses(maxPRs, hasApiKey, false);

            // Auto-show analysis for cached PRs
            await autoShowAnalysis(analyzedPRs, createConfig());
          }
        }
      } catch (error) {
        console.error("Error auto-showing analysis:", error);
      } finally {
        // Delayed loading state reset to prevent flicker
        setTimeout(() => {
          loadingStateRef.current = false;
          setIsLocalLoading(false);
        }, 100);
      }
    };

    fetchCachedAnalyses();
  }, [
    prsToAnalyze,
    maxPRs,
    hasApiKey,
    apiKey,
    apiProvider,
    analysisSummary,
    isLoading,
    checkCachedAnalyses,
    autoShowAnalysis,
    createConfig,
  ]);

  // Update analysis display when view mode changes
  useEffect(() => {
    if (analysisSummary && !isLoading) {
      handleRefreshAnalysis();
    }
  }, [viewAllAnalyzedPRs]);

  // Function to refresh analysis based on current view mode
  const handleRefreshAnalysis = async () => {
    if ((!hasApiKey && !apiKey) || isLoading) return;

    try {
      // Set loading through ref to prevent flicker
      loadingStateRef.current = true;
      setIsLocalLoading(true);

      const config = createConfig();

      // Respect the user's current PR selection
      // Only show PRs that are selected by the user AND have been analyzed
      const targetPRs = prsToAnalyze.filter(
        (pr) =>
          selectedPRIds.includes(pr.id) && allAnalyzedPRIds.includes(pr.id)
      );

      // Set loading state for PRs being refreshed
      if (targetPRs.length > 0) {
        setLoadingPRIds(targetPRs.map((pr) => pr.id));

        // Notify Timeline about each PR refresh starting
        targetPRs.forEach((pr) => {
          const analyzeStartEvent = new CustomEvent("pr-analysis-started", {
            detail: { prId: pr.id },
          });
          window.dispatchEvent(analyzeStartEvent);
        });
      }

      // Analyze without a timeout for more responsive UI
      const results = await analyzeMultiplePRs(targetPRs, config, 0);

      // Notify Timeline about each PR refresh completing
      results.forEach((result) => {
        const analyzeCompleteEvent = new CustomEvent("pr-analysis-completed", {
          detail: { prId: result.prId },
        });
        window.dispatchEvent(analyzeCompleteEvent);
      });

      // Clear loading state
      setLoadingPRIds([]);

      // Also trigger a refresh check for any new analyses
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error refreshing analysis:", error);
      // Clear loading state on error
      setLoadingPRIds([]);

      // Notify about refresh failures
      const targetPRs = prsToAnalyze.filter(
        (pr) =>
          selectedPRIds.includes(pr.id) && allAnalyzedPRIds.includes(pr.id)
      );

      targetPRs.forEach((pr) => {
        const analyzeFailedEvent = new CustomEvent("pr-analysis-failed", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeFailedEvent);
      });
    } finally {
      // Reset loading state with a small delay to ensure render stability
      setTimeout(() => {
        loadingStateRef.current = false;
        setIsLocalLoading(false);
      }, 150);
    }
  };

  // Subscribe to Timeline PR analysis changes - simplified to reduce renders
  useEffect(() => {
    // Skip if already analyzing
    if (isLoading) return () => {};

    // Check for newly analyzed PRs less frequently (5 seconds)
    const intervalId = setInterval(async () => {
      if (isLoading) return;

      // Only check PRs that aren't already known to be analyzed
      const unannotatedPRs = prsToAnalyze.filter(
        (pr) => !allAnalyzedPRIds.includes(pr.id)
      );

      if (unannotatedPRs.length === 0) return;

      // Check if any PRs have been newly analyzed
      const newIds = [];

      for (const pr of unannotatedPRs) {
        // Check memory cache first (faster)
        let isAnalyzed = !!getAnalysisFromMemoryCache(pr.id);

        // If not in memory, check persistent cache
        if (!isAnalyzed) {
          isAnalyzed = !!(await getAnalysisForPR(pr.id));
        }

        if (isAnalyzed) {
          newIds.push(pr.id);
        }
      }

      // Only update if we found new analyses
      if (newIds.length > 0) {
        setAllAnalyzedPRIds((prev) => {
          const uniqueIds = new Set([...prev, ...newIds]);
          return Array.from(uniqueIds);
        });

        // Only trigger refresh if we're already displaying results and aren't analyzing
        if (analysisSummary && !isLoading) {
          setRefreshTrigger((prev) => prev + 1);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [
    prsToAnalyze,
    allAnalyzedPRIds,
    getAnalysisFromMemoryCache,
    getAnalysisForPR,
    isLoading,
    analysisSummary,
    setAllAnalyzedPRIds,
    setRefreshTrigger,
  ]);

  // Listen for PR analysis events from Timeline
  useEffect(() => {
    const handleAnalysisStarted = (e: Event) => {
      // Reset the refresh check timer
      setRefreshTrigger((prev) => prev + 1);

      // Try to get PR ID from the event if available
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      // Add the PR to the loading list if we have its ID
      if (prId) {
        setLoadingPRIds((prev) => [...prev, prId]);
      }
    };

    const handleAnalysisCompleted = (e: Event) => {
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      if (prId) {
        // Remove the PR from loading state
        setLoadingPRIds((prev) => prev.filter((id) => id !== prId));

        // Update allAnalyzedPRIds to include this PR
        setAllAnalyzedPRIds((prev) => {
          if (prev.includes(prId)) return prev;
          return [...prev, prId];
        });

        // Only update selectedPRIds to include this newly analyzed PR
        // Don't modify other selections
        setSelectedPRIds((prev) => {
          if (prev.includes(prId)) return prev;
          return [...prev, prId];
        });

        // Add to newlyAnalyzedPRIds to ensure it shows up in the analysis
        setNewlyAnalyzedPRIds((prev) => {
          if (prev.includes(prId)) return prev;
          return [...prev, prId];
        });

        // Always immediately show the analysis when a PR is analyzed from Timeline
        const config = createConfig();

        // Get the PR object
        const analyzedPR = prsToAnalyze.find((pr) => pr.id === prId);

        if (analyzedPR && !isLoading) {
          // Set loading state via ref to prevent flicker
          loadingStateRef.current = true;
          setIsLocalLoading(true);

          // Immediately show the analysis for this PR
          setTimeout(async () => {
            try {
              // First analyze just the new PR to ensure it's in the cache
              await analyzeMultiplePRs([analyzedPR], config, 0);

              // Get the current selection state - only show PRs that are both
              // analyzed AND selected (plus the new one)
              const selectedAnalyzedPRs = prsToAnalyze.filter(
                (pr) =>
                  (selectedPRIds.includes(pr.id) &&
                    allAnalyzedPRIds.includes(pr.id)) ||
                  pr.id === prId
              );

              // Show the analysis with the current selection state
              await analyzeMultiplePRs(selectedAnalyzedPRs, config, 0);
            } finally {
              // Reset loading state with delay
              setTimeout(() => {
                loadingStateRef.current = false;
                setIsLocalLoading(false);
              }, 250);
            }
          }, 100);
        }
      }
    };

    // Handle analysis failed event
    const handleAnalysisFailed = (e: Event) => {
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      // Remove the PR from loading state if we have its ID
      if (prId) {
        setLoadingPRIds((prev) => prev.filter((id) => id !== prId));
      }
    };

    // Add event listeners
    window.addEventListener("pr-analysis-started", handleAnalysisStarted);
    window.addEventListener("pr-analysis-completed", handleAnalysisCompleted);
    window.addEventListener("pr-analysis-failed", handleAnalysisFailed);

    return () => {
      // Clean up event listeners
      window.removeEventListener("pr-analysis-started", handleAnalysisStarted);
      window.removeEventListener(
        "pr-analysis-completed",
        handleAnalysisCompleted
      );
      window.removeEventListener("pr-analysis-failed", handleAnalysisFailed);
    };
  }, [
    analysisSummary,
    prsToAnalyze,
    apiKey,
    apiProvider,
    createConfig,
    analyzeMultiplePRs,
    setAllAnalyzedPRIds,
    setSelectedPRIds,
    isLoading,
    allAnalyzedPRIds,
    selectedPRIds,
    setNewlyAnalyzedPRIds,
  ]);

  // Handle analyze button click
  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    if (isLoading) return;

    try {
      // Set loading through ref to prevent flicker
      loadingStateRef.current = true;
      setIsLocalLoading(true);

      // Save API key if opted in
      saveApiKey();
      setHasApiKey(true);

      const config = createConfig(apiKey);

      // Reset state for newly analyzed PRs
      setNewlyAnalyzedPRIds([]);

      // Store the current cached PRs before analysis
      const previouslyCachedIds = [...cachedPRIds];

      // Set the PRs that will be analyzed as loading
      const prsToLoad = prsToAnalyze
        .slice(0, maxPRs)
        .filter((pr) => !allAnalyzedPRIds.includes(pr.id));

      // Update loading PRs
      setLoadingPRIds(prsToLoad.map((pr) => pr.id));

      // Notify Timeline component about each PR analysis starting
      prsToLoad.forEach((pr) => {
        const analyzeStartEvent = new CustomEvent("pr-analysis-started", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeStartEvent);
      });

      // Call analyzeMultiplePRs - it will handle cache usage
      const results = await analyzeMultiplePRs(prsToAnalyze, config, maxPRs);

      // Notify Timeline component about each PR analysis completing
      results.forEach((result) => {
        const analyzeCompleteEvent = new CustomEvent("pr-analysis-completed", {
          detail: { prId: result.prId },
        });
        window.dispatchEvent(analyzeCompleteEvent);
      });

      // Clear loading state
      setLoadingPRIds([]);

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
    } catch (error) {
      console.error("Error during analysis:", error);
      // Clear loading state on error too
      setLoadingPRIds([]);

      // Notify about analysis failure for each PR
      const prsToLoad = prsToAnalyze
        .slice(0, maxPRs)
        .filter((pr) => !allAnalyzedPRIds.includes(pr.id));

      prsToLoad.forEach((pr) => {
        const analyzeFailedEvent = new CustomEvent("pr-analysis-failed", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeFailedEvent);
      });
    } finally {
      // Reset loading state with delay to prevent flicker
      setTimeout(() => {
        loadingStateRef.current = false;
        setIsLocalLoading(false);
      }, 150);
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
    if (isLoading) return;

    // Ask for confirmation
    if (
      !window.confirm(
        "Are you sure you want to clear all cached PR analysis data? This cannot be undone."
      )
    ) {
      return;
    }

    const success = await clearAnalysisCache();

    if (success) {
      // If we have an analysis summary showing, hide it
      if (analysisSummary) {
        // We can't directly modify analysisSummary,
        // so we'll reload the page to reset the state
        window.location.reload();
      } else {
        // Show confirmation
        alert("All cached PR analysis data has been cleared.");
      }
    } else {
      alert("Failed to clear cache. Please try again.");
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
      {/* Header with settings toggle */}
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

      {/* Analysis Controls */}
      <AnalysisControls
        maxPRs={maxPRs}
        setMaxPRs={setMaxPRs}
        cachedCount={cachedCount}
        viewAllAnalyzedPRs={viewAllAnalyzedPRs}
        allAnalyzedPRIds={allAnalyzedPRIds}
        handleToggleViewAllAnalyzed={handleToggleViewAllAnalyzed}
        isAnalyzing={isLoading}
        hasApiKey={hasApiKey}
        apiKey={apiKey}
        analysisSummary={analysisSummary}
      />

      {/* PR Selection Panel */}
      {!isLoading &&
        analysisSummary &&
        (allAnalyzedPRIds.length > 0 || loadingPRIds.length > 0) && (
          <PRSelectionPanel
            prsToAnalyze={prsToAnalyze}
            allAnalyzedPRIds={allAnalyzedPRIds}
            selectedPRIds={selectedPRIds}
            loadingPRIds={loadingPRIds}
            onTogglePR={togglePR}
          />
        )}

      {/* Configuration Panel */}
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
          isAnalyzing={isLoading}
          handleAnalyze={handleAnalyze}
          setApiKey={setApiKey}
          handleResetApiKey={handleResetApiKey}
          handleClearCache={handleClearCache}
        />
      )}

      {/* Initial states and loading */}
      {!hasApiKey && !apiKey && !analysisSummary && !isLoading && (
        <AnalysisStatus cachedCount={cachedCount} />
      )}

      {/* Only show loading indicator when explicitly analyzing or loading cached PRs */}
      {isLoading && <AnalysisLoadingIndicator />}

      {/* Analysis Results */}
      {!isLoading && analysisSummary && selectedPRIds.length > 0 && (
        <AnalysisResults
          analysisSummary={analysisSummary}
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          allAnalyzedPRIds={allAnalyzedPRIds}
        />
      )}

      {/* Empty state when no PRs are selected but analysis exists */}
      {!isLoading && analysisSummary && selectedPRIds.length === 0 && (
        <EmptySelectionState onSelectAllPRs={selectAllPRs} />
      )}

      {/* Empty state when user has API key but no PRs analyzed yet */}
      {!isLoading &&
        !analysisSummary &&
        !isConfigVisible &&
        (hasApiKey || apiKey) && (
          <NoAnalyzedPRsState
            handleAnalyze={handleAnalyze}
            hasApiKey={!!apiKey || hasApiKey}
            maxPRs={maxPRs}
            setMaxPRs={setMaxPRs}
            cachedCount={cachedCount}
          />
        )}

      {/* Get started state - show when no analysis is happening, no API key, and config not shown */}
      {!hasApiKey &&
        !apiKey &&
        !isLoading &&
        !analysisSummary &&
        !isConfigVisible && (
          <InitialState setIsConfigVisible={setIsConfigVisible} />
        )}
    </div>
  );
}
