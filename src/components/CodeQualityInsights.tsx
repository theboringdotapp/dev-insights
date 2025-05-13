import React, { useEffect, useState, useRef, useCallback } from "react";
import MetricsSummary from "./insights/MetricsSummary";
// InsightsSummary component removed as per requirements
import EmptyState from "./insights/EmptyState";
import { PullRequestItem, PRAnalysisResult, MetaAnalysisResult } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import {
  calculateCommonThemes,
  generateMetaAnalysis,
} from "../lib/aiAnalysisService";

import { useAPIConfiguration } from "../hooks/useAPIConfiguration";
import ConfigurationPanel from "./code-quality/ConfigurationPanel";
import AnalysisResults from "./code-quality/AnalysisResults";
import AnalysisLoadingIndicator from "./code-quality/AnalysisLoadingIndicator";
import PRSelectionPanel from "./code-quality/components/PRSelectionPanel";
import MetaAnalysis from "./code-quality/MetaAnalysis";

import { MODEL_OPTIONS } from "../lib/models";
import cacheService from "../lib/cacheService";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";
const GEMINI_KEY_STORAGE = "github-review-gemini-key";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
}

/**
 * CodeQualityInsights component provides meta-analysis of analyzed PRs
 * as an AI assistant that identifies patterns and provides development insights.
 */
export function CodeQualityInsights({
  pullRequests,
  allPRs,
}: CodeQualityInsightsProps) {
  // Core metrics hook
  const { analyzeMultiplePRs } = usePRMetrics();

  // Get ALL relevant state and actions from Zustand store
  const {
    analyzingPRIds,
    allAnalyzedPRIds,
    selectedPRIds,
    apiProvider, // Get provider from store
    selectedModel, // Get model from store
    setCalculatedThemes, // Use new action
    metaAnalysisResult,
    isGeneratingMetaAnalysis,
    setIsGeneratingMetaAnalysis,
    setMetaAnalysisResult,
    addAnalyzedPRIds,
    toggleSelectedPR,
    setSelectedModel, // Restore action
    // Career Development features removed as per requirements
    commonStrengths, // Get themes from store
    commonWeaknesses,
    commonSuggestions,
    averageScore,
    setSelectedPRIds,
    clearAnalysisData, // Need this for clear cache
  } = useAnalysisStore();

  // API configuration hook (now only manages key and saveToken preference)
  const {
    apiKey,
    saveApiKey,
    handleProviderChange, // Need this from API hook
    setApiKey, // Need this
    setSaveToken, // Need this
    saveToken, // Need this
    handleResetApiKey, // Need this
  } = useAPIConfiguration();

  console.log(`[CodeQualityInsights] Rendering. apiKey state: '${apiKey}'`);

  // Local component state (remains local)
  const [maxPRs, setMaxPRs] = useState(5);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);
  const [isPatternsOutdated, setIsPatternsOutdated] = useState(false);

  // Convert Sets to arrays for components that need arrays
  const allAnalyzedPRIdsArray = Array.from(allAnalyzedPRIds);
  const selectedPRIdsArray = Array.from(selectedPRIds);

  // Overall loading state combines hook flag and store set size
  const isLoading = analyzingPRIds.size > 0; // Use only store state

  // Determine which PRs to potentially analyze based on filters
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // Ref to track mounted state and prevent initial effect run
  const isMountedRef = useRef(false);

  // Ref to prevent duplicate analysis calls
  const isAnalyzingRef = useRef(false);

  // Effect to handle model auto-selection (uses store state/actions)
  useEffect(() => {
    const models = MODEL_OPTIONS[apiProvider] || [];
    const currentProviderModels = models.map((m) => m.id);

    if (models.length === 1) {
      // Auto-select if only one model exists and it's not already selected
      if (selectedModel !== models[0].id) {
        setSelectedModel(models[0].id);
        console.log(`Auto-selected model for ${apiProvider}: ${models[0].id}`);
      }
    } else {
      // If multiple models exist for the provider OR no models exist (invalid provider?):
      // Check if a model is selected AND if it's NOT valid for the CURRENT provider.
      if (selectedModel && !currentProviderModels.includes(selectedModel)) {
        // Clear the selection ONLY if the currently selected model is incompatible
        setSelectedModel(undefined);
        console.log(
          `Cleared incompatible model selection (${selectedModel}) for provider ${apiProvider}.`
        );
      }
      // If a model is selected AND it *is* valid, do nothing - keep the user's/persisted choice.
    }
    // Depend on provider AND the selected model itself
  }, [apiProvider, selectedModel, setSelectedModel]);

  // Removed wrapped handleProviderChange - use store action directly

  // Loading state
  const isOverallLoading = isLoading;

  // Function to generate meta-analysis across selected PRs
  const handleGenerateMetaAnalysis = useCallback(async () => {
    if (!apiKey || !apiProvider || !selectedModel) {
      console.warn(
        "[handleGenerateMetaAnalysis] Cannot generate meta-analysis: API config incomplete."
      );
      alert("Please ensure API provider, model, and key are configured.");
      return;
    }

    if (selectedPRIds.size < 2) {
      alert("Please select at least 2 analyzed PRs for meta-analysis.");
      return;
    }
    
    try {
      setIsGeneratingMetaAnalysis(true);
      
      // Fetch PR analysis data for selected PRs
      const prAnalysisPromises = Array.from(selectedPRIds).map(prId => 
        cacheService.getPRAnalysis(prId)
      );
      
      const prAnalysisResults = await Promise.all(prAnalysisPromises);
      const validResults = prAnalysisResults.filter(result => 
        result && result.feedback
      ) as PRAnalysisResult[];
      
      if (validResults.length < 2) {
        throw new Error("Not enough valid PR analysis data available");
      }
      
      // Generate meta-analysis
      const metaAnalysis = await generateMetaAnalysis(validResults, {
        apiKey,
        provider: apiProvider,
        model: selectedModel
      });
      
      setMetaAnalysisResult(metaAnalysis);
      // Reset the outdated flag when new patterns are generated
      setIsPatternsOutdated(false);
    } catch (error) {
      console.error("Failed to generate meta-analysis:", error);
      alert(`Failed to generate meta-analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
      setMetaAnalysisResult(null);
    } finally {
      setIsGeneratingMetaAnalysis(false);
    }
  }, [apiKey, apiProvider, selectedModel, selectedPRIds, setIsGeneratingMetaAnalysis, setMetaAnalysisResult]);

  // Removed handleGenerateSummary function since we're no longer including Career Development

  // Effect for discovering analyzed IDs and setting initial selection on mount
  useEffect(() => {
    // Run only once on initial mount
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    console.log(
      "[Initial ID Discovery Effect] RUNNING - Checking cache for new PRs..."
    );

    const discoverAndSetInitialSelection = async () => {
      let currentKnownIds = Array.from(
        useAnalysisStore.getState().allAnalyzedPRIds
      );
      console.log(
        `[Initial ID Discovery Effect] Known analyzed IDs before check: ${
          currentKnownIds.join(", ") || "None"
        }`
      );

      // Determine PRs to check in cache (those not already known)
      const effectivePRsToCheck = useAllPRs && allPRs ? allPRs : pullRequests;
      const prIdsToCheckInCache = effectivePRsToCheck
        .map((pr) => pr.id)
        .filter((id) => !currentKnownIds.includes(id)); // Use includes for array

      let newlyFoundCachedIds: number[] = [];
      if (prIdsToCheckInCache.length > 0) {
        console.log(
          `[Initial ID Discovery Effect] Checking cache for ${
            prIdsToCheckInCache.length
          } potential new PR IDs: ${prIdsToCheckInCache.join(", ")}`
        );
        try {
          const cacheResults = await Promise.all(
            prIdsToCheckInCache.map((id) => cacheService.getPRAnalysis(id))
          );
          newlyFoundCachedIds = cacheResults
            .filter((result) => result !== null)
            .map((result) => result!.prId);

          if (newlyFoundCachedIds.length > 0) {
            console.log(
              `[Initial ID Discovery Effect] Found ${
                newlyFoundCachedIds.length
              } new analyzed PRs in cache. Adding IDs to store: ${newlyFoundCachedIds.join(
                ", "
              )}`
            );
            addAnalyzedPRIds(newlyFoundCachedIds); // Add new IDs to store
            // Update our local list of known IDs for the next step
            currentKnownIds = [...currentKnownIds, ...newlyFoundCachedIds];
          } else {
            console.log(
              "[Initial ID Discovery Effect] No new analyzed PRs found in cache."
            );
          }
        } catch (error) {
          console.error(
            "[Initial ID Discovery Effect] Error checking cache for new PRs:",
            error
          );
        }
      } else {
        console.log(
          "[Initial ID Discovery Effect] No new PRs to check in cache."
        );
      }

      // --- Set initial selection ---
      // Select ALL known analyzed PRs initially
      if (currentKnownIds.length > 0) {
        console.log(
          `[Initial ID Discovery Effect] Setting initial selected PRs to ALL known analyzed IDs: ${currentKnownIds.join(
            ", "
          )}`
        );
        setSelectedPRIds(currentKnownIds);
      } else {
        console.log(
          `[Initial ID Discovery Effect] No known analyzed PRs found, initial selection is empty.`
        );
        setSelectedPRIds([]); // Ensure it's empty if no PRs found
      }

      // DO NOT load themes or summary here - let the other effect handle it
      console.log("[Initial ID Discovery Effect] COMPLETED.");
    };

    discoverAndSetInitialSelection();
    // Dependencies: only actions needed to update IDs/selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addAnalyzedPRIds, setSelectedPRIds, pullRequests, allPRs, useAllPRs]); // Added PR list dependencies

  // *** NEW Effect: Update themes based on selected PRs ***
  useEffect(() => {
    const currentSelectedIds = Array.from(selectedPRIds); // Get current selection
    console.log(
      `[Selection Change Effect] Running. Selected IDs: ${
        currentSelectedIds.join(", ") || "None"
      }`
    );

    const updateThemesForSelection = async () => {
      if (currentSelectedIds.length === 0) {
        console.log(
          "[Selection Change Effect] No PRs selected. Clearing themes."
        );
        setCalculatedThemes({
          commonStrengths: [],
          commonWeaknesses: [],
          commonSuggestions: [],
          averageScore: 0,
        });
        // Career Development summary removed as per requirements
        return;
      }

      console.log(
        `[Selection Change Effect] Fetching data for ${currentSelectedIds.length} selected PRs...`
      );
      try {
        const results: PRAnalysisResult[] = [];
        for (const id of currentSelectedIds) {
          const result = await cacheService.getPRAnalysis(id);
          if (result) {
            results.push(result);
          } else {
            console.warn(
              `[Selection Change Effect] Could not find cached data for selected PR #${id}`
            );
          }
        }

        if (results.length > 0) {
          console.log(
            `[Selection Change Effect] Calculating themes for ${results.length} results...`
          );
          const themes = calculateCommonThemes(results);
          console.log(
            "[Selection Change Effect] Calculated themes:",
            JSON.stringify(themes)
          );
          setCalculatedThemes(themes); // Update store
        } else {
          console.warn(
            "[Selection Change Effect] No valid results found for selected PRs. Clearing themes."
          );
          setCalculatedThemes({
            commonStrengths: [],
            commonWeaknesses: [],
            commonSuggestions: [],
            averageScore: 0,
          });
        }

        // Career Development summary removed as per requirements
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
        // Career Development summary removed
      }
    };

    updateThemesForSelection();

    // This effect should run when selectedPRIds changes
      
    // Mark patterns as outdated if we have an existing meta analysis
    if (metaAnalysisResult && !isGeneratingMetaAnalysis) {
      setIsPatternsOutdated(true);
    }
}, [selectedPRIds, setCalculatedThemes, metaAnalysisResult, isGeneratingMetaAnalysis]); // Add necessary dependencies

  // Function to trigger the *manual* analysis of PRs (handleAnalyze)
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
    saveApiKey();

    console.log(
      `Starting manual analysis with Provider: ${apiProvider}, Model: ${selectedModel}`
    );

    try {
      const prsToConsider = useAllPRs && allPRs ? allPRs : pullRequests;
      // Get current state to filter correctly
      const currentAnalyzedIds = useAnalysisStore.getState().allAnalyzedPRIds;
      const currentAnalyzingIds = useAnalysisStore.getState().analyzingPRIds;

      const prsToAnalyzeNow = prsToConsider
        .filter(
          (pr) =>
            !currentAnalyzedIds.has(pr.id) && !currentAnalyzingIds.has(pr.id)
        )
        .slice(0, maxPRs);

      if (prsToAnalyzeNow.length === 0) {
        alert("All eligible PRs are already analyzed or being analyzed.");
        isAnalyzingRef.current = false;
        return;
      }

      console.log(
        `Attempting to manually analyze ${prsToAnalyzeNow.length} PRs...`
      );

      const config: AIAnalysisConfig = {
        apiKey,
        provider: apiProvider,
        model: selectedModel,
      };

      const results: PRAnalysisResult[] = await analyzeMultiplePRs(
        prsToAnalyzeNow,
        config,
        maxPRs
      );
      // ... handle results, calculate themes, set state ...
      console.log(`Analysis completed for ${results.length} PRs.`);
      console.log(`Raw results from analyzeMultiplePRs:`, results); // Log raw results

      const successfulResults = results.filter((res) => !res.error);
      if (successfulResults.length > 0) {
        // Get IDs of successfully analyzed PRs
        const newlyAnalyzedIds = successfulResults.map((r) => r.prId);
        console.log(
          `[handleAnalyze] Adding newly analyzed IDs to store: ${newlyAnalyzedIds.join(
            ", "
          )}`
        );
        addAnalyzedPRIds(newlyAnalyzedIds); // Add IDs to store

        // Calculate themes ONLY for the newly analyzed PRs
        const newThemes = calculateCommonThemes(successfulResults);
        console.log(
          `[handleAnalyze] Calculated themes for new results:`,
          newThemes
        );

        // Replace existing themes
        setCalculatedThemes(newThemes);
        console.log(
          "[handleAnalyze] Store updated with new themes."
        );
          
        // Mark patterns as outdated if we have meta-analysis results
        if (metaAnalysisResult) {
          setIsPatternsOutdated(true);
        }
      } else {
        console.warn(
          "Manual analysis completed, but no successful results to aggregate."
        );
        // Decide if we should clear existing themes here or leave them
        // setCalculatedThemes({ ... }); // Optional clear
      }
    } catch (error: unknown) {
      console.error("Error during manual analysis orchestration:", error);
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
    // Removed allAnalyzedPRIds, analyzingPRIds from deps - use getState inside
    analyzeMultiplePRs,
    setCalculatedThemes,
    saveApiKey,
    maxPRs,
    addAnalyzedPRIds,
  ]);

  // Toggle between filtered PRs and all PRs
  const handleToggleAllPRs = () => {
    setUseAllPRs(!useAllPRs);
    // Reset selection when toggling? Optional.
    // setSelectedPRIds([]);
  };

  // Handle maxPRs change
  const handleMaxPRsChange = (value: number) => {
    setMaxPRs(value);
  };

  // Update clear cache function to work without the hook
  const handleClearCacheAndStore = useCallback(async () => {
    try {
      console.log("[handleClearCacheAndStore] Clearing cache and store...");
      await cacheService.clearAllPRAnalysis(); // Clear IndexedDB
      clearAnalysisData(); // Clear Zustand store
      console.log("[handleClearCacheAndStore] Cache and store cleared.");
      // Reset local component state related to analysis if needed
      // e.g., setUseAllPRs(false)?
      setIsConfigVisible(true); // Show config after clearing
    } catch (error) {
      console.error(
        "[handleClearCacheAndStore] Error clearing cache/store:",
        error
      );
      alert("Failed to clear cache."); // Inform user
    }
  }, [clearAnalysisData]); // Dependency on store action

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
  console.log(`[CodeQualityInsights Render] hasApiKey: ${!!apiKey}`);
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
    <div className="sticky top-4 z-10 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-md space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Header with settings toggle */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
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
          <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Code Quality Assistant</h3>
        </div>
        {/* Always show the toggle button */}
        <button
          onClick={() => setIsConfigVisible(!isConfigVisible)}
          className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>

      {/* --- Configuration Panel (Render when visible) --- */}
      {isConfigVisible && (
        <ConfigurationPanel
          apiKey={apiKey}
          apiProvider={apiProvider}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          saveToken={saveToken}
          setSaveToken={setSaveToken}
          handleProviderChange={handleProviderChange}
          useAllPRs={useAllPRs}
          handleToggleAllPRs={handleToggleAllPRs}
          allPRs={allPRs}
          pullRequests={pullRequests}
          // Pass setIsConfigVisible to allow the panel to close itself
          setIsConfigVisible={setIsConfigVisible}
          // handleAnalyze is no longer needed for the primary button
          // isAnalyzing is no longer needed for the primary button
          setApiKey={setApiKey}
          handleResetApiKey={handleResetApiKey}
          handleClearCache={handleClearCacheAndStore}
          allAnalyzedPRIdsSize={allAnalyzedPRIds.size}
        />
      )}

      {/* Top nav action buttons placeholder - removed as requested */}

      {/* --- Main Results Area --- */}
      {!isConfigVisible && (
        <>
          {/* Analysis Overview Section */}
          {!isOverallLoading && allAnalyzedPRIds.size > 0 && (
            <div className="space-y-3">
              <MetricsSummary
                analyzedPRCount={allAnalyzedPRIds.size}
                averageScore={averageScore}
              />
              
              {/* Refresh Patterns button below Analysis Overview */}
              {selectedPRIds.size >= 2 && (
                <div className="flex items-center justify-between bg-white/50 dark:bg-zinc-800/30 backdrop-blur-sm rounded-md p-3">
                  <div className="flex-1">
                    {metaAnalysisResult ? (
                      isPatternsOutdated ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="inline h-3.5 w-3.5 mr-1" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          Patterns need to be refreshed
                        </p>
                      ) : (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="inline h-3.5 w-3.5 mr-1" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <poly}
          
          {/* Pattern Analysis Results */}
          {metaAnalysisResult ? (
            <div className="mt-4">
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                  Finding Patterns...
                </h3>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 pl-11">
                Analyzing patterns across your pull requests. This may take a few moments.
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                  Analyzing PRs...
                </h3>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 pl-11">
                Generating insights from your pull requests. This may take a few moments.
              </div>
            </div>
          ) : allAnalyzedPRIds.size === 0 ? (
            <EmptyState handleAnalyze={handleAnalyze} maxPRs={maxPRs} hasApiKey={!!apiKey} setIsConfigVisible={setIsConfigVisible} handleMaxPRsChange={handleMaxPRsChange} />
          ) : selectedPRIds.size < 2 ? (
            <div className="p-4 mt-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-zinc-900/30 rounded-lg text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Select at least 2 analyzed PRs to find patterns
              </p>
              <button
                onClick={() => setSelectedPRIds(Array.from(allAnalyzedPRIds))}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-800/60 transition-colors"
              >
                Select All PRs
              </button>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-zinc-900/30 rounded-lg text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                {selectedPRIds.size} PRs selected for pattern analysis
              </p>
              <button
                onClick={handleGenerateMetaAnalysis}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                disabled={isGeneratingMetaAnalysis}
              >
                {isGeneratingMetaAnalysis ? (
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
                    Find Patterns Across PRs
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
