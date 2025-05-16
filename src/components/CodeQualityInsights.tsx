import { useCallback, useEffect, useRef } from "react";
import EmptyState from "./insights/EmptyState";
import MetricsSummary from "./insights/MetricsSummary";

// Import the extracted localStorage utility functions
import { CachedMetaAnalysisResult } from "../lib/localStorageUtils";

// Import the new custom hooks
import { useConfigurationManagement } from "../hooks/useConfigurationManagement";
import { useInitialPRDiscovery } from "../hooks/useInitialPRDiscovery";
import { usePatternAnalysisCache } from "../hooks/usePatternAnalysisCache";
import { usePRAnalysisManager } from "../hooks/usePRAnalysisManager";

import {
  calculateCommonThemes,
  generateMetaAnalysis,
} from "../lib/aiAnalysisService";
import { PRAnalysisResult, PullRequestItem } from "../lib/types";
import { useAnalysisStore } from "../stores/analysisStore";

import { useAPIConfiguration } from "../hooks/useAPIConfiguration";
import ConfigurationPanel from "./code-quality/ConfigurationPanel";
// Unused components commented out to fix linter errors
// import AnalysisResults from "./code-quality/AnalysisResults";
// import AnalysisLoadingIndicator from "./code-quality/AnalysisLoadingIndicator";
// import PRSelectionPanel from "./code-quality/components/PRSelectionPanel";
import { useDeveloperContext } from "../contexts/DeveloperContext";
import MetaAnalysis from "./code-quality/MetaAnalysis";

import cacheService from "../lib/cacheService";

// Local storage keys - commented out since they're unused
// const OPENAI_KEY_STORAGE = "github-review-openai-key";
// const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";
// const GEMINI_KEY_STORAGE = "github-review-gemini-key";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  developerId?: string; // This is now optional as we'll use the context
}

/**
 * Custom hook to manage theme updates based on selected PRs
 */
function useThemeManagement(
  selectedPRIds: Set<number>,
  metaAnalysisResult: CachedMetaAnalysisResult | null,
  analyzedPRsInLastPattern: Set<number>,
  isGeneratingMetaAnalysis: boolean,
  developerId: string
) {
  const { setCalculatedThemes } = useAnalysisStore();
  const { setIsPatternsOutdated } = usePatternAnalysisCache({ developerId });

  // Cache for PR results to avoid repeated database calls
  const resultsCache = useRef<Record<number, PRAnalysisResult>>({});
  // Track previous selection for change detection
  const prevSelectedIdsRef = useRef<Set<number>>(new Set());

  // Update themes based on selected PRs
  useEffect(() => {
    const currentSelectedIds = Array.from(selectedPRIds);

    // Check if selection actually changed to avoid unnecessary work
    const prevSelectedIds = Array.from(prevSelectedIdsRef.current);
    const selectionChanged =
      prevSelectedIds.length !== currentSelectedIds.length ||
      currentSelectedIds.some((id) => !prevSelectedIdsRef.current.has(id));

    if (!selectionChanged && Object.keys(resultsCache.current).length > 0) {
      // If selection hasn't changed and we have cached results, skip processing
      return;
    }

    // Update the ref with current selection
    prevSelectedIdsRef.current = new Set(currentSelectedIds);

    // Log only when selection actually changes
    if (selectionChanged) {
      console.log(
        `[Selection Change Effect] Selection changed. IDs: ${
          currentSelectedIds.join(", ") || "None"
        }`
      );
    }

    const updateThemesForSelection = async () => {
      if (currentSelectedIds.length === 0) {
        // Clear themes if no selection
        setCalculatedThemes({
          commonStrengths: [],
          commonWeaknesses: [],
          commonSuggestions: [],
          averageScore: 0,
        });
        return;
      }

      try {
        const results: PRAnalysisResult[] = [];
        const idsToFetch = currentSelectedIds.filter(
          (id) => !resultsCache.current[id]
        );

        // Only fetch what we don't already have in cache
        if (idsToFetch.length > 0) {
          for (const id of idsToFetch) {
            const result = await cacheService.getPRAnalysis(id, developerId);
            if (result) {
              results.push(result);
              // Store in our local cache to avoid repeated fetches
              resultsCache.current[id] = result;
            }
          }
        }

        // Use cached results for the rest
        for (const id of currentSelectedIds) {
          if (resultsCache.current[id] && !idsToFetch.includes(id)) {
            results.push(resultsCache.current[id]);
          }
        }

        if (results.length > 0) {
          const themes = calculateCommonThemes(results);
          setCalculatedThemes(themes);
        } else if (currentSelectedIds.length > 0) {
          // Only log warning if we expected results but got none
          console.warn(
            `[Selection Change Effect] No valid results found for ${currentSelectedIds.length} selected PRs. Clearing themes.`
          );
          setCalculatedThemes({
            commonStrengths: [],
            commonWeaknesses: [],
            commonSuggestions: [],
            averageScore: 0,
          });
        }
      } catch (error) {
        console.error(
          "[Selection Change Effect] Error fetching or processing selected PR data:",
          error
        );
        // Clear themes on error
        setCalculatedThemes({
          commonStrengths: [],
          commonWeaknesses: [],
          commonSuggestions: [],
          averageScore: 0,
        });
      }
    };

    updateThemesForSelection();

    // Check if we need to mark patterns as outdated (only if meta analysis exists)
    if (
      metaAnalysisResult &&
      !isGeneratingMetaAnalysis &&
      analyzedPRsInLastPattern.size > 0
    ) {
      const currentSelection = new Set(selectedPRIds);

      // Check if selection has changed since last pattern analysis
      if (currentSelection.size !== analyzedPRsInLastPattern.size) {
        setIsPatternsOutdated(true);
      } else {
        // Check if any PRs are different
        const anyDifferent = Array.from(currentSelection).some(
          (id) => !analyzedPRsInLastPattern.has(id)
        );

        if (anyDifferent) {
          setIsPatternsOutdated(true);
        }
      }
    }
  }, [
    selectedPRIds, // Re-run when selection changes
    developerId, // Re-run when developer changes
    // Include these dependencies for state updates but with less frequent changes
    metaAnalysisResult,
    isGeneratingMetaAnalysis,
    analyzedPRsInLastPattern,
    setCalculatedThemes,
    setIsPatternsOutdated,
  ]);

  // Clear cache when developer changes
  useEffect(() => {
    // Clear results cache when developer changes
    resultsCache.current = {};
    prevSelectedIdsRef.current = new Set();
  }, [developerId]);
}

/**
 * CodeQualityInsights component provides meta-analysis of analyzed PRs
 * as an AI assistant that identifies patterns and provides development insights.
 */
export function CodeQualityInsights({
  pullRequests,
  allPRs,
}: CodeQualityInsightsProps) {
  // Use the DeveloperContext instead of a custom hook
  const { developerId } = useDeveloperContext();

  // Get ALL relevant state and actions from Zustand store
  const {
    analyzingPRIds,
    allAnalyzedPRIds,
    selectedPRIds,
    apiProvider,
    selectedModel,
    metaAnalysisResult: storeMetaAnalysisResult,
    isGeneratingMetaAnalysis,
    setIsGeneratingMetaAnalysis,
    setMetaAnalysisResult: setStoreMetaAnalysisResult,
    clearAnalysisData,
    commonStrengths,
    averageScore,
  } = useAnalysisStore();

  // Use our new pattern analysis cache hook
  const {
    metaAnalysisResult,
    isFromCache,
    isPatternsOutdated,
    analyzedPRsInLastPattern,
    setMetaAnalysisResult,
    setIsPatternsOutdated,
    cachePatternAnalysis,
    clearPatternCache,
  } = usePatternAnalysisCache({ developerId });

  // Use the configuration management hook
  const {
    apiKey,
    saveToken,
    setApiKey,
    setSaveToken,
    saveApiKey,
    handleResetApiKey,
    handleProviderChange,
    setSelectedModel: configSetSelectedModel,
    isConfigVisible,
    setIsConfigVisible,
    useAllPRs,
    setUseAllPRs,
    maxPRs,
    setMaxPRs,
  } = useConfigurationManagement();

  // Use the PR discovery hook to find previously analyzed PRs in cache
  useInitialPRDiscovery({
    pullRequests,
    allPRs,
    useAllPRs,
  });

  // Use the theme management hook
  useThemeManagement(
    selectedPRIds,
    metaAnalysisResult,
    analyzedPRsInLastPattern,
    isGeneratingMetaAnalysis,
    developerId
  );

  // Use the PR analysis manager
  const { handleAnalyze } = usePRAnalysisManager({
    pullRequests,
    allPRs,
    useAllPRs,
    maxPRs,
    setIsPatternsOutdated,
  });

  // Sync meta analysis between hook and store
  useEffect(() => {
    if (metaAnalysisResult !== storeMetaAnalysisResult) {
      setStoreMetaAnalysisResult(metaAnalysisResult);
    }
  }, [metaAnalysisResult, storeMetaAnalysisResult, setStoreMetaAnalysisResult]);

  // Get API configuration (will be phased out once migration to useConfigurationManagement is complete)
  const {
    apiKey: legacyApiKey,
    handleProviderChange: legacyHandleProviderChange,
    setApiKey: legacySetApiKey,
    setSaveToken: legacySetSaveToken,
    saveToken: legacySaveToken,
    handleResetApiKey: legacyHandleResetApiKey,
  } = useAPIConfiguration();

  // Use the apiKey from configuration management hook, falling back to legacy if not available
  const effectiveApiKey = apiKey || legacyApiKey;

  console.log(
    `[CodeQualityInsights] Rendering. apiKey state: '${effectiveApiKey}'`
  );

  // Overall loading state combines hook flag and store set size
  const isLoading = analyzingPRIds.size > 0; // Use only store state
  const isOverallLoading = isLoading;

  // Track the current developer ID for detecting changes and cache status
  const prevDeveloperIdRef = useRef<string | null>(null);

  // Function to handle the analyze button click
  const handleAnalyzeClick = useCallback(async () => {
    if (!effectiveApiKey || !selectedModel) {
      alert("Please select an AI provider, a model, and enter your API key.");
      return;
    }

    try {
      saveApiKey(); // Save API key if configured to do so

      await handleAnalyze({
        apiKey: effectiveApiKey,
        provider: apiProvider,
        model: selectedModel,
      });
    } catch (error) {
      console.error("Error during analysis:", error);
      alert(
        `Error during analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [effectiveApiKey, selectedModel, apiProvider, handleAnalyze, saveApiKey]);

  // Function to generate meta-analysis across selected PRs
  const handleGenerateMetaAnalysis = useCallback(async () => {
    if (!effectiveApiKey || !apiProvider || !selectedModel) {
      console.warn(
        "[handleGenerateMetaAnalysis] Cannot generate meta-analysis: API config incomplete."
      );
      alert("Please ensure API provider, model, and key are configured.");
      return;
    }

    if (selectedPRIds.size < 3) {
      alert("Please select at least 3 analyzed PRs for meta-analysis.");
      return;
    }

    try {
      setIsGeneratingMetaAnalysis(true);

      // Fetch PR analysis data for selected PRs
      const prAnalysisPromises = Array.from(selectedPRIds).map((prId) =>
        cacheService.getPRAnalysis(prId, developerId)
      );

      const prAnalysisResults = await Promise.all(prAnalysisPromises);
      const validResults = prAnalysisResults.filter(
        (result) => result && result.feedback
      ) as PRAnalysisResult[];

      if (validResults.length < 2) {
        throw new Error("Not enough valid PR analysis data available");
      }

      // Generate meta-analysis
      const metaAnalysis = await generateMetaAnalysis(validResults, {
        apiKey: effectiveApiKey,
        provider: apiProvider,
        model: selectedModel,
      });

      // Store which PRs were included in this pattern analysis
      const selectedPRIdsArray = Array.from(selectedPRIds);
      console.log(
        `[handleGenerateMetaAnalysis] Setting analyzedPRIds to: [${selectedPRIdsArray.join(
          ", "
        )}]`
      );

      const metaAnalysisWithMetadata = {
        ...metaAnalysis,
        analyzedPRIds: selectedPRIdsArray,
      };

      // Use our new hook's function to cache the result
      await cachePatternAnalysis(metaAnalysisWithMetadata);
    } catch (error) {
      console.error("Failed to generate meta-analysis:", error);
      alert(
        `Failed to generate meta-analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMetaAnalysisResult(null);
    } finally {
      setIsGeneratingMetaAnalysis(false);
    }
  }, [
    effectiveApiKey,
    apiProvider,
    selectedModel,
    selectedPRIds,
    setIsGeneratingMetaAnalysis,
    setMetaAnalysisResult,
    cachePatternAnalysis,
    developerId,
  ]);

  // Toggle between filtered PRs and all PRs
  const handleToggleAllPRs = useCallback(() => {
    setUseAllPRs(!useAllPRs);
  }, [useAllPRs, setUseAllPRs]);

  // Update clear cache function to work without the hook
  const handleClearCacheAndStore = useCallback(async () => {
    try {
      console.log("[handleClearCacheAndStore] Clearing cache and store...");

      // Use our new hook's function to clear pattern cache
      await clearPatternCache();

      // Also clear PR analysis and Zustand store
      await cacheService.clearAllPRAnalysis(); // Clear PR analysis from IndexedDB
      clearAnalysisData(); // Clear Zustand store

      console.log("[handleClearCacheAndStore] Cache and store cleared.");

      // Reset any remaining local state
      prevDeveloperIdRef.current = null;

      setIsConfigVisible(true); // Show config after clearing
    } catch (error) {
      console.error(
        "[handleClearCacheAndStore] Error clearing cache/store:",
        error
      );
      alert("Failed to clear cache."); // Inform user
    }
  }, [clearAnalysisData, clearPatternCache, setIsConfigVisible]);

  // Log state just before rendering conditional UI
  console.log(
    `[CodeQualityInsights Render] =========================================`
  );
  console.log(
    `[CodeQualityInsights Render] isLoading (analyzingPRIds.size > 0): ${isLoading} (size: ${analyzingPRIds.size})`
  );
  console.log(
    `[CodeQualityInsights Render] isOverallLoading: ${isOverallLoading}`
  );
  console.log(`[CodeQualityInsights Render] hasApiKey: ${!!effectiveApiKey}`);
  console.log(
    `[CodeQualityInsights Render] allAnalyzedPRIds.size: ${allAnalyzedPRIds.size}`
  );
  console.log(
    `[CodeQualityInsights Render] selectedPRIds.size: ${selectedPRIds.size}`
  );
  console.log(
    `[CodeQualityInsights Render] commonStrengths.length: ${commonStrengths.length}`
  );
  console.log(
    `[CodeQualityInsights Render] isConfigVisible: ${isConfigVisible}`
  );
  console.log(
    `[CodeQualityInsights Render] =========================================`
  );

  return (
    <div className="sticky top-4 z-10 bg-white dark:bg-gray-900 p-0 rounded-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden max-h-[calc(100vh-2rem)]">
      {/* Header with settings toggle - sticky at top */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-white dark:bg-gray-900 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-purple-500 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
            AI Analysis
          </h3>
        </div>
        {/* Always show the toggle button */}
        <button
          onClick={() => setIsConfigVisible(!isConfigVisible)}
          className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>

      {/* Content container with scrolling */}
      <div className="p-1 space-y-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
        {/* Scrollable content area */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* --- Configuration Panel (Render when visible) --- */}
          {isConfigVisible && (
            <ConfigurationPanel
              apiKey={effectiveApiKey}
              apiProvider={apiProvider}
              selectedModel={selectedModel}
              setSelectedModel={configSetSelectedModel}
              saveToken={saveToken !== undefined ? saveToken : legacySaveToken}
              setSaveToken={setSaveToken || legacySetSaveToken}
              handleProviderChange={
                handleProviderChange || legacyHandleProviderChange
              }
              useAllPRs={useAllPRs}
              handleToggleAllPRs={handleToggleAllPRs}
              allPRs={allPRs}
              pullRequests={pullRequests}
              // Pass setIsConfigVisible to allow the panel to close itself
              setIsConfigVisible={setIsConfigVisible}
              // handleAnalyze is no longer needed for the primary button
              // isAnalyzing is no longer needed for the primary button
              setApiKey={setApiKey || legacySetApiKey}
              handleResetApiKey={handleResetApiKey || legacyHandleResetApiKey}
              handleClearCache={handleClearCacheAndStore}
              allAnalyzedPRIdsSize={allAnalyzedPRIds.size}
            />
          )}

          {/* Top nav action buttons placeholder - removed as requested */}

          {/* --- Main Results Area --- */}
          {!isConfigVisible && (
            <>
              {/* Analysis Overview Section */}
              {allAnalyzedPRIds.size > 0 && (
                <div className="space-y-3">
                  {isOverallLoading ? (
                    // Skeleton for MetricsSummary
                    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow animate-pulse">
                      <div className="flex justify-between items-center mb-3">
                        <div className="h-5 bg-zinc-300 dark:bg-zinc-700 rounded w-2/5"></div>{" "}
                        {/* Text: "X PRs Analyzed" */}
                        <div className="h-5 bg-zinc-300 dark:bg-zinc-700 rounded w-1/4"></div>{" "}
                        {/* Text: "Avg Score" */}
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="h-8 bg-zinc-300 dark:bg-zinc-700 rounded w-1/5"></div>{" "}
                        {/* Value: Count */}
                        <div className="h-8 bg-zinc-300 dark:bg-zinc-700 rounded w-1/5"></div>{" "}
                        {/* Value: Score */}
                      </div>
                    </div>
                  ) : (
                    <MetricsSummary
                      analyzedPRCount={allAnalyzedPRIds.size}
                      averageScore={averageScore}
                    />
                  )}
                </div>
              )}

              {/* Pattern Analysis Results */}
              {metaAnalysisResult ? (
                <div className="mt-0">
                  {/* Debug log wrapped in a React Fragment */}
                  {/* {console.log(
                    `[CodeQualityInsights Debug] isPatternsOutdated: ${isPatternsOutdated}, metaAnalysisResult exists: ${!!metaAnalysisResult}, isFromCache: ${isFromCache}, analyzedPRsInLastPattern.size: ${
                      analyzedPRsInLastPattern.size
                    }, selectedPRIds.size: ${selectedPRIds.size}`
                  )} */}
                  {isFromCache && !isPatternsOutdated && (
                    <div className="text-right mb-1 p-1 rounded-md">
                      <div className="flex items-center justify-end">
                        <p className="text-xs text-zinc-400 ">
                          Analysis from{" "}
                          {(metaAnalysisResult as CachedMetaAnalysisResult)
                            .timestamp
                            ? new Date(
                                (
                                  metaAnalysisResult as CachedMetaAnalysisResult
                                ).timestamp!
                              ).toLocaleDateString()
                            : "a previous session"}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Debug log wrapped in a React Fragment */}
                  {/* {console.log(
                    `[OutdatedWarning Debug] Should show warning? ${
                      isPatternsOutdated && !!metaAnalysisResult
                    }, isPatternsOutdated=${isPatternsOutdated}, metaAnalysisResult exists=${!!metaAnalysisResult}`
                  )} */}
                  {isPatternsOutdated && metaAnalysisResult && (
                    <div className="mb-4 p-3 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/40 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            Patterns may be outdated
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 mb-3">
                            Your selection has changed since the last pattern
                            analysis. Refresh to include all selected PRs.
                          </p>
                          <button
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-800/60 transition-colors"
                            onClick={handleGenerateMetaAnalysis}
                            disabled={isGeneratingMetaAnalysis}
                          >
                            {isGeneratingMetaAnalysis ? (
                              <>
                                <span className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="mr-1.5 h-3.5 w-3.5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21 2v6h-6"></path>
                                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                                  <path d="M3 22v-6h6"></path>
                                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                                </svg>
                                Refresh Patterns
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <MetaAnalysis
                    metaAnalysis={metaAnalysisResult}
                    isLoading={isGeneratingMetaAnalysis}
                    error={null}
                  />
                </div>
              ) : isGeneratingMetaAnalysis ? (
                <div className="p-4 mt-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-zinc-900/30 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 mr-3 flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 text-purple-600 dark:text-purple-400"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                    <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                      Finding Patterns...
                    </h3>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 pl-11">
                    Analyzing patterns across your pull requests. This may take
                    a few moments.
                  </div>
                </div>
              ) : isOverallLoading ? (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-zinc-900/30 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 mr-3 flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 text-purple-600 dark:text-purple-400"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                    <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                      Analyzing PRs...
                    </h3>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 pl-11">
                    Generating insights from your pull requests. This may take a
                    few moments.
                  </div>
                </div>
              ) : allAnalyzedPRIds.size === 0 ? (
                <EmptyState
                  handleAnalyze={handleAnalyzeClick}
                  maxPRs={maxPRs}
                  hasApiKey={!!effectiveApiKey}
                  setIsConfigVisible={setIsConfigVisible}
                  handleMaxPRsChange={setMaxPRs}
                />
              ) : (
                <div className="group relative overflow-hidden p-6 mt-4 bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-100 dark:from-purple-800/30 dark:via-indigo-900/30 dark:to-purple-800/40 rounded-xl text-left animate-subtle-gradient">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none opacity-50 group-hover:opacity-100"></div>
                  <div className="relative z-10">
                    <div className="mb-4">
                      <h4 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-1">
                        Perform Deep Analysis for Enhanced Insights
                      </h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        Analyze patterns across your selected PRs to understand
                        your code quality, identify growth areas, and receive
                        actionable feedback.
                      </p>
                    </div>

                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1 font-medium">
                      This feature helps you:
                    </p>
                    <ul className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300 mb-4 list-disc list-inside pl-2">
                      <li>
                        Identify overarching patterns & themes in your code
                        quality.
                      </li>
                      <li>
                        Receive tailored focus areas & learning resources.
                      </li>
                      <li>
                        Get actionable tips for managers to support developer
                        growth.
                      </li>
                    </ul>

                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-md mb-5 border border-purple-200 dark:border-purple-700/50">
                      <div className="flex items-start">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2 shrink-0 mt-0.5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          Note: This performs an additional AI analysis using
                          your configured provider and may incur costs.
                        </p>
                      </div>
                    </div>

                    <div className="text-center mt-2">
                      {selectedPRIds.size < 3 ? (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                          {`Select at least 3 analyzed PRs for Deep Analysis (you have ${selectedPRIds.size} selected).`}
                        </p>
                      ) : (
                        <p className="text-sm text-green-600 dark:text-green-400 mb-3">
                          {`${selectedPRIds.size} PRs selected. Ready for Deep Analysis!`}
                        </p>
                      )}
                      <button
                        onClick={() => {
                          if (selectedPRIds.size >= 3) {
                            handleGenerateMetaAnalysis();
                          }
                        }}
                        disabled={
                          (selectedPRIds.size >= 3 &&
                            isGeneratingMetaAnalysis) ||
                          selectedPRIds.size < 3
                        }
                        className={`w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                          (selectedPRIds.size >= 3 &&
                            isGeneratingMetaAnalysis) ||
                          selectedPRIds.size < 3
                            ? "bg-purple-400 text-white cursor-not-allowed dark:bg-purple-800 opacity-75 focus:ring-purple-400 dark:focus:ring-purple-700"
                            : "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 focus:ring-purple-500"
                        }`}
                      >
                        {selectedPRIds.size < 3 ? (
                          <>Deep Analysis</>
                        ) : selectedPRIds.size >= 3 &&
                          isGeneratingMetaAnalysis ? (
                          <>
                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                            Finding Patterns...
                          </>
                        ) : (
                          <>
                            <svg
                              className="mr-2 h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="3"></circle>
                              <path d="m19 19-3.3-3.3"></path>
                              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>
                            </svg>
                            Deep Analysis
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
