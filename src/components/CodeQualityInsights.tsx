import React, { useState, useEffect, useRef, useCallback } from "react";
import { PullRequestItem, PRAnalysisResult } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import {
  aggregateFeedback,
  AIAnalysisConfig, // Import AIAnalysisConfig
} from "../lib/aiAnalysisService";
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
import { MODEL_OPTIONS } from "../lib/models"; // Import MODEL_OPTIONS
import cacheService from "../lib/cacheService"; // Import cacheService

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";
const GEMINI_KEY_STORAGE = "github-review-gemini-key";

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
  // Core metrics hook (re-added destructuring)
  const { analyzeMultiplePRs, getAnalysisForPR, getAnalysisFromMemoryCache } =
    usePRMetrics();

  // Get ALL relevant state and actions from Zustand store
  const {
    analyzingPRIds,
    analysisSummary,
    allAnalyzedPRIds,
    selectedPRIds,
    apiProvider, // Get provider from store
    selectedModel, // Get model from store
    failAnalysis,
    setAnalysisSummary,
    addAnalyzedPRIds,
    setSelectedPRIds,
    toggleSelectedPR,
    selectAllPRs,
    setApiProvider, // Get provider action from store
    setSelectedModel, // Get model action from store
  } = useAnalysisStore();

  // API configuration hook (now only manages key and saveToken preference)
  const {
    apiKey,
    setApiKey,
    saveToken,
    setSaveToken,
    handleResetApiKey,
    // handleProviderChange, // We use the store action directly now
    saveApiKey,
  } = useAPIConfiguration();

  console.log(`[CodeQualityInsights] Rendering. apiKey state: '${apiKey}'`);

  // Local component state (remains local)
  const [maxPRs, setMaxPRs] = useState(5);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);

  // Convert Sets to arrays for components that need arrays
  const allAnalyzedPRIdsArray = Array.from(allAnalyzedPRIds);
  const selectedPRIdsArray = Array.from(selectedPRIds);

  // Overall loading state combines hook flag and store set size
  const isLoading = analyzingPRIds.size > 0; // Use only store state

  // Determine which PRs to potentially analyze based on filters
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // PR Cache Hook (destructure only needed values)
  const { cachedCount, clearAnalysisCache, cachedPRIds, newlyAnalyzedPRIds } =
    usePRCache(
      prsToAnalyze,
      getAnalysisForPR,
      getAnalysisFromMemoryCache,
      analyzeMultiplePRs,
      isLoading
    );

  // Ref to track mounted state and prevent initial effect run
  const isMountedRef = useRef(false);

  // Ref to prevent duplicate analysis calls
  const isAnalyzingRef = useRef(false);

  // Effect to handle model auto-selection (uses store state/actions)
  useEffect(() => {
    const models = MODEL_OPTIONS[apiProvider] || [];
    if (models.length === 1) {
      if (selectedModel !== models[0].id) {
        // Only update if different
        setSelectedModel(models[0].id);
        console.log(`Auto-selected model for ${apiProvider}: ${models[0].id}`);
      }
    } else {
      // Clear selection if multiple models or provider invalid
      // Only clear if a model *is* currently selected
      if (selectedModel !== undefined) {
        setSelectedModel(undefined);
        console.log(`Cleared model selection for ${apiProvider}.`);
      }
    }
    // Depend on apiProvider from store and the action setter
  }, [apiProvider, selectedModel, setSelectedModel]);

  // Removed wrapped handleProviderChange - use store action directly

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

    if (!apiKey || !apiProvider || !selectedModel) {
      console.warn("Cannot refresh summary: API config or model missing.");
      return;
    }

    try {
      // Create the full config object directly
      const config: AIAnalysisConfig = {
        apiKey,
        provider: apiProvider,
        model: selectedModel,
      };

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
    apiKey,
    apiProvider,
    selectedModel,
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

  // Effect to check initial API key state & config visibility
  useEffect(() => {
    // Logic to show config panel initially
    if (!apiKey && !analysisSummary && allAnalyzedPRIds.size === 0) {
      const anyKey =
        localStorage.getItem(OPENAI_KEY_STORAGE) ||
        localStorage.getItem(ANTHROPIC_KEY_STORAGE) ||
        localStorage.getItem(GEMINI_KEY_STORAGE);
      if (!anyKey) {
        setIsConfigVisible(true);
      }
    }
  }, [apiKey, analysisSummary, allAnalyzedPRIds]);

  // Effect for checking cache on mount and populating store
  useEffect(() => {
    // Flag to prevent running multiple times, e.g. due to HMR
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    console.log("Checking persistent cache for previously analyzed PRs...");

    const checkInitialCache = async () => {
      const knownAnalyzedIds = useAnalysisStore.getState().allAnalyzedPRIds;
      const prsToCheck = prsToAnalyze.filter(
        (pr) => !knownAnalyzedIds.has(pr.id)
      );

      if (prsToCheck.length === 0) {
        console.log("No new PRs to check in cache.");
        return;
      }

      try {
        const cacheResults = await Promise.all(
          prsToCheck.map((pr) => cacheService.getPRAnalysis(pr.id))
        );

        const newlyFoundCachedIds = cacheResults
          .map((result, index) => (result ? prsToCheck[index].id : null))
          .filter((id): id is number => id !== null);

        if (newlyFoundCachedIds.length > 0) {
          console.log(
            `Found ${newlyFoundCachedIds.length} previously analyzed PRs in cache. Adding to store.`
          );
          addAnalyzedPRIds(newlyFoundCachedIds);
        } else {
          console.log("No previously analyzed PRs found in cache.");
        }
      } catch (error) {
        console.error("Error checking initial cache:", error);
      }
    };

    checkInitialCache();
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prsToAnalyze /* Include prsToAnalyze as it's needed for filtering */]);

  // Function to trigger the analysis
  const handleAnalyze = useCallback(async () => {
    if (isAnalyzingRef.current) {
      console.log("Analysis already in progress.");
      return;
    }
    if (!apiKey || !selectedModel) {
      console.error("API key or model not selected.");
      alert("Please select an AI provider, a model, and enter your API key.");
      // Optionally, bring focus to the config panel if hidden
      return;
    }

    isAnalyzingRef.current = true;
    saveApiKey(); // Save key if configured

    // Add logging to check provider/model state just before analysis
    console.log(
      `Starting analysis with Provider: ${apiProvider}, Model: ${selectedModel}`
    );

    try {
      // Determine the list of PRs to potentially analyze
      const prsToConsider = useAllPRs && allPRs ? allPRs : pullRequests;

      // Filter out PRs already analyzed or currently being analyzed
      const prsToAnalyzeNow = prsToConsider
        .filter(
          (pr) => !allAnalyzedPRIds.has(pr.id) && !analyzingPRIds.has(pr.id)
        )
        .slice(0, maxPRs);

      if (prsToAnalyzeNow.length === 0) {
        alert(
          "All eligible PRs have already been analyzed or are being analyzed."
        );
        isAnalyzingRef.current = false;
        return;
      }

      console.log(`Attempting to analyze ${prsToAnalyzeNow.length} PRs...`);

      const config: AIAnalysisConfig = {
        apiKey,
        provider: apiProvider,
        model: selectedModel,
      };

      // Call the analysis function from usePRMetrics
      const results: PRAnalysisResult[] = await analyzeMultiplePRs(
        prsToAnalyzeNow,
        config,
        maxPRs
      );

      console.log(`Analysis completed for ${results.length} PRs.`);
      console.log(`Raw results from analyzeMultiplePRs:`, results); // Log raw results

      // Aggregate feedback from successful results for the summary
      const successfulResults = results.filter((res) => !res.error);
      if (successfulResults.length > 0) {
        const summary = aggregateFeedback(successfulResults);
        console.log(`Aggregated summary:`, summary); // Log aggregated summary
        setAnalysisSummary(summary);
      } else {
        // Handle case where analysis ran but all failed or returned no data
        console.warn(
          "Analysis completed, but no successful results to aggregate."
        );
        // Decide if summary should be cleared or kept
        // setAnalysisSummary(null);
      }
    } catch (error: unknown) {
      console.error("Error during analysis orchestration:", error);
      // REMOVED the alert() call
      // alert(
      //   `An error occurred during analysis: ${
      //     error instanceof Error ? error.message : String(error)
      //   }`
      // );
      // Toast is handled within analyzePRCode now
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [
    apiKey,
    selectedModel,
    apiProvider,
    useAllPRs,
    allPRs,
    pullRequests,
    allAnalyzedPRIds,
    analyzingPRIds,
    analyzeMultiplePRs,
    setAnalysisSummary,
    saveApiKey,
    maxPRs,
    // Add other dependencies if needed (e.g., failAnalysis if used in catch)
  ]);

  // Toggle between filtered PRs and all PRs
  const handleToggleAllPRs = () => {
    setUseAllPRs(!useAllPRs);
    // Reset selection when toggling? Optional.
    // setSelectedPRIds([]);
  };

  // Log state just before rendering conditional UI
  console.log(
    `[CodeQualityInsights Render] isLoading: ${isLoading}, hasApiKey: ${!!apiKey}, analysisSummary: ${
      analysisSummary ? "Exists" : "Null"
    }, allAnalyzedPRIds.size: ${allAnalyzedPRIds.size}, selectedPRIds.size: ${
      selectedPRIds.size
    }, isConfigVisible: ${isConfigVisible}`
  );

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100">
      {/* Header with settings toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Code Quality Insights</h3>
        {/* Simplify toggle condition to just check apiKey */}
        {(apiKey || allAnalyzedPRIds.size > 0) && (
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
          apiProvider={apiProvider} // Pass provider from store
          selectedModel={selectedModel} // Pass model from store
          setSelectedModel={setSelectedModel} // Pass action from store
          maxPRs={maxPRs}
          saveToken={saveToken}
          setSaveToken={setSaveToken}
          handleProviderChange={setApiProvider} // Pass provider action from store
          useAllPRs={useAllPRs}
          handleToggleAllPRs={handleToggleAllPRs}
          allPRs={allPRs}
          pullRequests={pullRequests}
          showOnlyImportantPRs={showOnlyImportantPRs}
          cachedCount={allAnalyzedPRIds.size} // Use store count
          isAnalyzing={isLoading}
          handleAnalyze={handleAnalyze}
          setApiKey={setApiKey}
          handleResetApiKey={handleResetApiKey}
          handleClearCache={async () => {
            const success = await clearAnalysisCache();
            if (success) {
              alert("Cache cleared.");
              if (!apiKey) setIsConfigVisible(true);
            } else {
              alert("Failed to clear cache.");
            }
          }}
        />
      )}

      {/* --- Conditional Content Rendering --- */}

      {/* Loading Indicator */}
      {isLoading && <AnalysisLoadingIndicator />}

      {/* Initial State: No API Key, No Analysis, Config Hidden */}
      {!isLoading &&
        !apiKey && // Rely only on apiKey state
        !analysisSummary &&
        !isConfigVisible && (
          <InitialState setIsConfigVisible={setIsConfigVisible} />
        )}

      {/* Status: API Key exists, No Analysis yet, Config Hidden */}
      {!isLoading &&
        apiKey && // Rely only on apiKey state
        !analysisSummary &&
        allAnalyzedPRIds.size === 0 &&
        !isConfigVisible && (
          <NoAnalyzedPRsState
            handleAnalyze={handleAnalyze}
            maxPRs={maxPRs}
            cachedCount={cachedCount}
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
        apiKey && // Rely only on apiKey state
        !analysisSummary &&
        !isConfigVisible &&
        cachedCount > 0 &&
        allAnalyzedPRIds.size === 0 && (
          <AnalysisStatus cachedCount={cachedCount} />
        )}
    </div>
  );
}
