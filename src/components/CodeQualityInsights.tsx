import React, { useState, useEffect, useRef, useCallback } from "react";
import { PullRequestItem, PRAnalysisResult } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import { aggregateFeedback } from "../lib/aiAnalysisService"; // Assuming path
import { useAPIConfiguration } from "../hooks/useAPIConfiguration";
import { usePRCache } from "./code-quality/hooks/usePRCache";
// Removed usePRSelection as its state is now in Zustand
import ConfigurationPanel from "./code-quality/ConfigurationPanel";
import AnalysisStatus from "./code-quality/AnalysisStatus";
import AnalysisResults from "./code-quality/AnalysisResults";
import InitialState from "./code-quality/InitialState";
import AnalysisLoadingIndicator from "./code-quality/AnalysisLoadingIndicator";
import PRSelectionPanel from "./code-quality/components/PRSelectionPanel";
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
    getAnalysisForPR, // Needed for usePRCache
    getAnalysisFromMemoryCache, // Needed for usePRCache
  } = usePRMetrics();

  // Get state and actions from Zustand store
  const {
    analyzingPRIds,
    analysisSummary,
    allAnalyzedPRIds,
    selectedPRIds,
    failAnalysis,
    setAnalysisSummary,
    addAnalyzedPRIds,
    setSelectedPRIds,
    toggleSelectedPR,
    selectAllPRs,
  } = useAnalysisStore();

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

  // Component state (remains local)
  const [maxPRs, setMaxPRs] = useState(5);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);

  // Convert Sets to arrays for components that need arrays
  const allAnalyzedPRIdsArray = Array.from(allAnalyzedPRIds);
  const selectedPRIdsArray = Array.from(selectedPRIds);

  // Overall loading state combines hook flag and store set size
  const isLoading = analyzingPRIds.size > 0; // Use only store state

  // Determine which PRs to potentially analyze based on filters
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // --- PR Cache Hook ---
  // This hook now likely needs modification to interact with the Zustand store
  // instead of receiving/managing allAnalyzedPRIds, analysisSummary etc. via props/state.
  // For now, pass necessary functions and potentially API config.
  const {
    cachedCount, // Keep track of how many analyses are in the persistent cache
    autoShowCompletedRef, // Keep if still needed internally by usePRCache
    checkCachedAnalyses, // Keep for potential initial load logic
    autoShowAnalysis, // Keep for potential initial load logic
    clearAnalysisCache, // Keep cache clearing functionality
    createConfig, // Keep config creation utility
    cachedPRIds, // Restore for AnalysisResults
    newlyAnalyzedPRIds, // Kept for AnalysisResults
    setNewlyAnalyzedPRIds, // Kept for handleAnalyze
  } = usePRCache(
    prsToAnalyze,
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
    analyzeMultiplePRs, // Pass analyze function
    isLoading, // Pass derived loading state
    apiProvider,
    apiKey
  );

  // Ref to track mounted state and prevent initial effect run
  const isMountedRef = useRef(false);

  // Function to refresh the analysis summary based on selection
  const refreshAnalysisSummary = useCallback(async () => {
    if (selectedPRIds.size === 0 || !analysisSummary) {
      // If nothing is selected, or no initial summary, clear the summary
      // setAnalysisSummary(null); // Or keep the old one? Let's keep it for now.
      return;
    }

    // Filter PRs that are both selected AND have been analyzed
    const selectedAndAnalyzedPRs = prsToAnalyze.filter(
      (pr) => selectedPRIds.has(pr.id) && allAnalyzedPRIds.has(pr.id)
    );

    if (selectedAndAnalyzedPRs.length === 0) {
      // If selection results in no valid PRs, clear summary
      setAnalysisSummary(null);
      return;
    }

    try {
      // Create config (needed for analyzeMultiplePRs)
      const config = createConfig();
      // Re-run analysis/fetch for selected PRs (analyzeMultiplePRs should use cache)
      // Let analyzeMultiplePRs process all provided PRs (it handles cache internally)
      const results = await analyzeMultiplePRs(selectedAndAnalyzedPRs, config);
      // Aggregate and update summary in the store
      const summary = await aggregateFeedback(results);
      setAnalysisSummary(summary);
    } catch (error) {
      console.error("Error refreshing analysis summary:", error);
      // Optionally handle error, maybe clear summary
      // setAnalysisSummary(null);
    }
  }, [
    selectedPRIds,
    allAnalyzedPRIds,
    prsToAnalyze,
    analysisSummary, // Depend on summary existence
    analyzeMultiplePRs,
    createConfig,
    setAnalysisSummary,
    aggregateFeedback,
  ]);

  // Effect to refresh analysis summary when selection changes
  useEffect(() => {
    // Prevent running on initial mount
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    // Only refresh if an analysis has already been run
    // AND the selection is not empty (otherwise summary might be cleared unnecessarily)
    if (analysisSummary && selectedPRIds.size > 0) {
      console.log("Selection changed, refreshing analysis summary...");
      refreshAnalysisSummary();
    }
  }, [selectedPRIds]); // Only run when selection changes

  // Check if API key exists on mount
  useEffect(() => {
    const openaiKey = localStorage.getItem(OPENAI_KEY_STORAGE);
    const anthropicKey = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
    const hasKey = !!(openaiKey || anthropicKey);
    setHasApiKey(hasKey);
    // Only show config if no keys are found and no analysis yet
    if (!hasKey && !analysisSummary && allAnalyzedPRIds.size === 0) {
      setIsConfigVisible(true);
    }
  }, [analysisSummary, allAnalyzedPRIds]); // Re-run if analysis appears

  // Effect for checking cache and auto-showing (Needs review/refactor with Zustand)
  useEffect(() => {
    // Skip if we have no PRs, analysis already shown, already loading, no key, or already done
    if (
      prsToAnalyze.length === 0 ||
      analysisSummary ||
      isLoading ||
      !hasApiKey ||
      autoShowCompletedRef.current
    ) {
      return;
    }

    const fetchAndShowCachedAnalyses = async () => {
      // This logic needs careful review. Does checkCachedAnalyses update the store now?
      // Or should we initialize the store from the cache here?
      // For now, assuming checkCachedAnalyses might populate the store or return data.
      console.log("Attempting to check/auto-show cached analysis...");
      try {
        // Check cache (assuming this might update store or return IDs)
        const initialCheckResult = await checkCachedAnalyses(
          maxPRs,
          true,
          true
        ); // hasApiKey=true

        if (!initialCheckResult || initialCheckResult.allIds.length === 0) {
          console.log("No cached analysis found to auto-show.");
          return; // No cached analysis found
        }

        // Add found IDs to the store if not already there (checkCachedAnalyses might do this already)
        addAnalyzedPRIds(initialCheckResult.allIds);

        // Get the actual PR objects for the cached IDs
        const analyzedPRs = prsToAnalyze.filter(
          (pr) => initialCheckResult.allIds.includes(pr.id) // Use includes here as it's an array from checkCachedAnalyses
        );

        if (analyzedPRs.length > 0 && !analysisSummary) {
          // Only auto-show if no summary exists yet
          console.log(
            `Auto-showing analysis for ${analyzedPRs.length} cached PRs.`
          );
          // Call autoShowAnalysis (assuming it now updates the store's analysisSummary)
          const config = createConfig();
          await autoShowAnalysis(analyzedPRs, config); // This should update the store
          autoShowCompletedRef.current = true; // Mark as done for this session
        }
      } catch (error) {
        console.error("Error during auto-show cached analysis:", error);
      }
    };

    fetchAndShowCachedAnalyses();
  }, [
    prsToAnalyze,
    maxPRs,
    hasApiKey,
    analysisSummary, // React to store changes
    isLoading, // React to derived loading state
    checkCachedAnalyses,
    autoShowAnalysis,
    createConfig,
    autoShowCompletedRef,
    addAnalyzedPRIds, // Added store action dependency
  ]);

  // Handle analyze button click
  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter an API key");
      setIsConfigVisible(true);
      return;
    }
    if (isLoading) return;

    try {
      saveApiKey();
      setHasApiKey(true);
      setIsConfigVisible(false); // Hide config on successful analysis start

      const config = createConfig(apiKey);

      // Get currently analyzed PRs from the store for comparison
      const previouslyAnalyzedIds = new Set(allAnalyzedPRIds);

      // Determine which PRs to analyze now (up to maxPRs, excluding already analyzed)
      const prsToAnalyzeNow = prsToAnalyze
        .filter((pr) => !previouslyAnalyzedIds.has(pr.id))
        .slice(0, maxPRs);

      if (prsToAnalyzeNow.length === 0) {
        alert("All visible PRs have already been analyzed.");
        // Optionally, select all analyzed PRs if none are selected
        if (selectedPRIds.size === 0 && allAnalyzedPRIds.size > 0) {
          selectAllPRs(Array.from(allAnalyzedPRIds));
        }
        return;
      }

      // Call analyzeMultiplePRs API
      const results: PRAnalysisResult[] = await analyzeMultiplePRs(
        prsToAnalyzeNow, // Only analyze the ones not previously analyzed
        config
      );

      const successfulResultIds: number[] = [];
      const newlyAnalyzedIds: number[] = [];

      // Update store for PRs that were attempted
      results.forEach((result) => {
        successfulResultIds.push(result.prId);
        if (!previouslyAnalyzedIds.has(result.prId)) {
          newlyAnalyzedIds.push(result.prId);
        }
      });

      // Update analysis summary in the store (aggregate only successful results)
      if (results.length > 0) {
        const summary = await aggregateFeedback(results);
        setAnalysisSummary(summary);
      } else if (prsToAnalyzeNow.length > 0) {
        // No results, but analysis was attempted, maybe clear summary?
        // Or keep existing summary if desired? For now, clear if no results.
        // setAnalysisSummary(null);
        console.warn("Analysis ran but returned no results.");
      }

      // Add newly analyzed IDs to the global set in the store
      if (newlyAnalyzedIds.length > 0) {
        addAnalyzedPRIds(newlyAnalyzedIds);
        // Update local state for highlighting in AnalysisResults
        setNewlyAnalyzedPRIds(newlyAnalyzedIds);
      }

      // Automatically select the PRs that were just successfully analyzed
      if (successfulResultIds.length > 0) {
        // Add successfully analyzed PRs to the current selection
        const currentSelection = new Set(selectedPRIds);
        successfulResultIds.forEach((id) => currentSelection.add(id));
        setSelectedPRIds(Array.from(currentSelection));
      }

      // Update filter if analyzing all PRs and not already showing all
      if (useAllPRs && showOnlyImportantPRs && onToggleFilter) {
        onToggleFilter(false);
      }
    } catch (error) {
      console.error("Error during analysis:", error);
      // Mark all attempted PRs as failed in the store on general error
      const attemptedPRIds = prsToAnalyze
        .filter((pr) => !allAnalyzedPRIds.has(pr.id))
        .slice(0, maxPRs)
        .map((pr) => pr.id);
      attemptedPRIds.forEach((id) => failAnalysis(id));
      // Note: failAnalysis might have already been called inside analyzeMultiplePRs for specific PRs,
      // but this ensures any PRs attempted by handleAnalyze but missed in results are marked as failed.
      // Optionally show user-facing error message
      alert(`An error occurred during analysis: ${error.message || error}`);
    } finally {
      // No explicit finally block needed for loading state reset
    }
  };

  // Toggle between filtered PRs and all PRs
  const handleToggleAllPRs = () => {
    setUseAllPRs(!useAllPRs);
    // Reset selection when toggling? Optional.
    // setSelectedPRIds([]);
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
      {/* Header with settings toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Code Quality Insights</h3>
        {/* Show settings toggle if API key exists OR if analysis has been performed */}
        {(hasApiKey || allAnalyzedPRIds.size > 0) && (
          <button
            onClick={() => setIsConfigVisible(!isConfigVisible)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isConfigVisible ? "Hide Settings" : "Show Settings"}
          </button>
        )}
      </div>

      {/* PR Selection Panel - Show if analysis exists and not loading */}
      {!isLoading && analysisSummary && allAnalyzedPRIds.size > 0 && (
        <PRSelectionPanel
          // Pass only PRs that *have* been analyzed for selection
          prsToAnalyze={prsToAnalyze}
          allAnalyzedPRIds={allAnalyzedPRIdsArray}
          selectedPRIds={selectedPRIdsArray}
          loadingPRIds={Array.from(analyzingPRIds)}
          onTogglePR={toggleSelectedPR}
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
          // Pass the count of analyzed PRs from the store
          cachedCount={allAnalyzedPRIds.size}
          isAnalyzing={isLoading}
          handleAnalyze={handleAnalyze} // Keep analyze button here
          setApiKey={setApiKey}
          handleResetApiKey={handleResetApiKey}
          handleClearCache={async () => {
            // Wrap the call to match expected void promise type
            const success = await clearAnalysisCache();
            if (success) {
              alert(
                "All cached PR analysis data and current results have been cleared."
              );
              // Show config if no API key after clearing
              if (
                !apiKey &&
                !localStorage.getItem(OPENAI_KEY_STORAGE) &&
                !localStorage.getItem(ANTHROPIC_KEY_STORAGE)
              ) {
                setIsConfigVisible(true);
              }
            } else {
              alert("Failed to clear persistent cache. Please try again.");
            }
          }}
        />
      )}

      {/* --- Conditional Content Rendering --- */}

      {/* Loading Indicator */}
      {isLoading && <AnalysisLoadingIndicator />}

      {/* Initial State: No API Key, No Analysis, Config Hidden */}
      {!isLoading &&
        !hasApiKey &&
        !apiKey &&
        !analysisSummary &&
        !isConfigVisible && (
          <InitialState setIsConfigVisible={setIsConfigVisible} />
        )}

      {/* Status: API Key exists, No Analysis yet, Config Hidden */}
      {!isLoading &&
        (hasApiKey || apiKey) &&
        !analysisSummary &&
        allAnalyzedPRIds.size === 0 &&
        !isConfigVisible && (
          <NoAnalyzedPRsState
            handleAnalyze={handleAnalyze}
            hasApiKey={hasApiKey || !!apiKey}
            maxPRs={maxPRs}
            setMaxPRs={setMaxPRs}
            cachedCount={cachedCount} // Show count from cache hook
          />
        )}

      {/* Analysis Results: Analysis exists, PRs selected */}
      {!isLoading && analysisSummary && selectedPRIds.size > 0 && (
        <AnalysisResults
          analysisSummary={analysisSummary}
          // Pass relevant IDs as arrays if needed by the component
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          allAnalyzedPRIds={allAnalyzedPRIdsArray}
        />
      )}

      {/* Empty Selection State: Analysis exists, but NO PRs selected */}
      {!isLoading &&
        analysisSummary &&
        selectedPRIds.size === 0 &&
        allAnalyzedPRIds.size > 0 && (
          <EmptySelectionState
            // Pass only the IDs that *have* been analyzed
            onSelectAllPRs={() => selectAllPRs(allAnalyzedPRIdsArray)}
          />
        )}

      {/* Fallback/Analysis Status (Cached Count): Key exists, no summary, but cache might have items */}
      {/* This might overlap with NoAnalyzedPRsState - review conditions */}
      {!isLoading &&
        (hasApiKey || apiKey) &&
        !analysisSummary &&
        !isConfigVisible &&
        cachedCount > 0 &&
        allAnalyzedPRIds.size === 0 && (
          <AnalysisStatus cachedCount={cachedCount} />
        )}
    </div>
  );
}
