import React, { useState, useEffect, useRef, useCallback } from "react";
import { PullRequestItem, PRAnalysisResult } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import {
  calculateCommonThemes,
  generateAICareerSummary,
  AIAnalysisConfig,
} from "../lib/aiAnalysisService";
import { useAPIConfiguration } from "../hooks/useAPIConfiguration";
import ConfigurationPanel from "./code-quality/ConfigurationPanel";
import AnalysisResults from "./code-quality/AnalysisResults";
import AnalysisLoadingIndicator from "./code-quality/AnalysisLoadingIndicator";
import PRSelectionPanel from "./code-quality/components/PRSelectionPanel";
import NoAnalyzedPRsState from "./code-quality/components/NoAnalyzedPRsState";
import { MODEL_OPTIONS } from "../lib/models";
import cacheService from "../lib/cacheService";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";
const GEMINI_KEY_STORAGE = "github-review-gemini-key";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  // showOnlyImportantPRs?: boolean; // Removed prop
}

/**
 * CodeQualityInsights component provides AI-based analysis of PRs
 * to identify code quality patterns, strengths, and weaknesses.
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
    addAnalyzedPRIds,
    toggleSelectedPR,
    setSelectedModel, // Restore action
    setCareerDevelopmentSummary, // Use new action
    isGeneratingSummary, // Destructure new state
    setIsGeneratingSummary, // Destructure new action
    commonStrengths, // Get themes from store
    commonWeaknesses,
    commonSuggestions,
    averageScore,
    careerDevelopmentSummary,
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
  const [maxPRs /*, setMaxPRs*/] = useState(5); // Removed unused setter
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);

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

  // Combine loading states
  const isOverallLoading = isLoading || isGeneratingSummary;

  // Function to *manually* generate ONLY the AI summary
  const handleGenerateSummary = useCallback(async () => {
    if (!apiKey || !apiProvider || !selectedModel) {
      console.warn(
        "[handleGenerateSummary] Cannot generate summary: API config incomplete."
      );
      alert("Please ensure API provider, model, and key are configured.");
      return;
    }
    // Check if themes are already calculated (they should be if this button is visible)
    if (
      commonStrengths.length === 0 &&
      commonWeaknesses.length === 0 &&
      commonSuggestions.length === 0 &&
      averageScore === 0
    ) {
      console.warn(
        "[handleGenerateSummary] Cannot generate summary: No theme data available."
      );
      alert(
        "No analysis data found to generate summary from. Analyze some PRs first."
      );
      return;
    }

    console.log(`[handleGenerateSummary] Generating AI career summary...`);
    setIsGeneratingSummary(true);
    try {
      // Prepare data for the summary generator
      const calculatedThemes = {
        commonStrengths,
        commonWeaknesses,
        commonSuggestions,
        averageScore,
      };
      const config: AIAnalysisConfig = {
        apiKey,
        provider: apiProvider,
        model: selectedModel,
      };

      // Call the function that ONLY generates the summary string
      const summaryText = await generateAICareerSummary(
        calculatedThemes,
        config
      );
      console.log(
        `[handleGenerateSummary] Summary text received:`,
        summaryText
      );

      // Update ONLY the career summary state in the store
      setCareerDevelopmentSummary(summaryText); // This action also sets isGeneratingSummary false
    } catch (error) {
      console.error("Error generating summary:", error);
      alert(
        `An error occurred while generating the summary: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Don't clear themes, just ensure loading is off
      setIsGeneratingSummary(false);
      setCareerDevelopmentSummary("(Error generating summary)"); // Set error state
    }
  }, [
    apiKey,
    apiProvider,
    selectedModel,
    commonStrengths, // Depend on existing theme data
    commonWeaknesses,
    commonSuggestions,
    averageScore,
    setIsGeneratingSummary,
    setCareerDevelopmentSummary,
    // generateAICareerSummary, // Stable function
  ]);

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
        setCareerDevelopmentSummary(null);
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

        // Always clear summary when selection changes
        setCareerDevelopmentSummary(null);
        console.log(
          "[Selection Change Effect] Summary cleared due to selection change."
        );
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
        setCareerDevelopmentSummary(null);
      }
    };

    updateThemesForSelection();

    // This effect should run when selectedPRIds changes
  }, [selectedPRIds, setCalculatedThemes, setCareerDevelopmentSummary]); // Add necessary dependencies

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

        setCareerDevelopmentSummary(null); // Clear summary when new analysis runs
        console.log(
          "[handleAnalyze] Store updated with new themes. Summary cleared."
        );
      } else {
        console.warn(
          "Manual analysis completed, but no successful results to aggregate."
        );
        // Decide if we should clear existing themes here or leave them
        // setCalculatedThemes({ ... }); // Optional clear
        setCareerDevelopmentSummary(null);
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
    setCareerDevelopmentSummary,
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
    `[CodeQualityInsights Render] isGeneratingSummary: ${isGeneratingSummary}`
  );
  console.log(
    `[CodeQualityInsights Render] isOverallLoading: ${isOverallLoading}`
  );
  console.log(`[CodeQualityInsights Render] hasApiKey: ${!!apiKey}`);
  console.log(
    `[CodeQualityInsights Render] careerDevelopmentSummary: ${
      careerDevelopmentSummary ? "Exists" : "Null"
    }`
  );
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
    <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-4">
      {/* Header with settings toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Code Quality Insights</h3>
        {/* Always show the toggle button */}
        <button
          onClick={() => setIsConfigVisible(!isConfigVisible)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isConfigVisible ? "Hide Settings" : "Show Settings"}
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

      {/* Loading Indicator (Top Level) */}
      {isOverallLoading && !isConfigVisible && <AnalysisLoadingIndicator />}

      {/* Initial State / Ready to Analyze State - Combined Logic */}
      {/* Show NoAnalyzedPRsState if config is hidden and no PRs analyzed yet */}
      {!isOverallLoading && allAnalyzedPRIds.size === 0 && !isConfigVisible && (
        <NoAnalyzedPRsState
          handleAnalyze={handleAnalyze}
          maxPRs={maxPRs}
          hasApiKey={!!apiKey} // Pass API key status
          setIsConfigVisible={setIsConfigVisible} // Pass function to open config
        />
      )}

      {/* --- Main Results Area (Render if PRs have been analyzed) --- */}
      {!isOverallLoading &&
        allAnalyzedPRIds.size > 0 &&
        !isConfigVisible && ( // Hide results when config is visible
          <>
            {/* PR Selection Panel (Always show if PRs analyzed) */}
            <PRSelectionPanel
              prsToAnalyze={prsToAnalyze}
              allAnalyzedPRIds={allAnalyzedPRIdsArray}
              selectedPRIds={selectedPRIdsArray}
              loadingPRIds={Array.from(analyzingPRIds)}
              onTogglePR={toggleSelectedPR}
            />

            {/* Analysis Results Container - Renders structure always */}
            {/* It handles showing button or details internally */}
            <AnalysisResults
              // Pass individual state pieces
              commonStrengths={commonStrengths}
              commonWeaknesses={commonWeaknesses}
              commonSuggestions={commonSuggestions}
              averageScore={averageScore}
              careerDevelopmentSummary={careerDevelopmentSummary} // Pass summary (can be null)
              isGeneratingSummary={isGeneratingSummary}
              selectedPRIds={selectedPRIdsArray} // ADDED selected PRs
              allAnalyzedPRIds={allAnalyzedPRIdsArray}
              onGenerateSummary={handleGenerateSummary}
              canGenerateSummary={!!apiKey && !isConfigVisible}
            />
          </>
        )}
    </div>
  );
}
