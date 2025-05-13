import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import MetricsSummary from "./insights/MetricsSummary";
// InsightsSummary component removed as per requirements
import EmptyState from "./insights/EmptyState";

// Constants for localStorage keys - Defined as constants outside component
const DEVELOPER_ID_KEY = "github-review-developer-id";
const LAST_PATTERN_RESULT_KEY = "github-review-pattern-result";
import {
  PullRequestItem,
  PRAnalysisResult,
  MetaAnalysisResult,
} from "../lib/types";
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
  developerId: string;
}

/**
 * CodeQualityInsights component provides meta-analysis of analyzed PRs
 * as an AI assistant that identifies patterns and provides development insights.
 */
export function CodeQualityInsights({
  pullRequests,
  allPRs,
  developerId: propDeveloperId = "unknown", // Renamed to clarify it's from props
}: CodeQualityInsightsProps) {
  // Get developer ID from URL search params (this takes precedence)
  const [searchParams] = useSearchParams();
  const urlDeveloperId = searchParams.get("username");

  // Try to get developer ID from localStorage as a fallback
  const loadDeveloperIdFromLocalStorage = useCallback(() => {
    try {
      return localStorage.getItem(DEVELOPER_ID_KEY) || null;
    } catch (e) {
      console.error(
        "[CodeQualityInsights] Error loading developer ID from localStorage:",
        e,
      );
      return null;
    }
  }, []);

  // Use URL developer ID if available, fallback to localStorage, then to prop
  const [developerId, setDeveloperId] = useState(
    urlDeveloperId || propDeveloperId,
  );

  // Effect to initialize developerId from localStorage if needed
  useEffect(() => {
    if ((!developerId || developerId === "unknown") && !urlDeveloperId) {
      const storedDeveloperId = loadDeveloperIdFromLocalStorage();
      if (storedDeveloperId) {
        console.log(
          `[CodeQualityInsights] Recovered developer ID from localStorage: ${storedDeveloperId}`,
        );
        setDeveloperId(storedDeveloperId);

        // If needed, update the URL with the recovered developer ID
        if (window.location.search === "") {
          try {
            // Create a new URL with the recovered developer ID
            const url = new URL(window.location.href);
            url.searchParams.set("username", storedDeveloperId);
            // Use replace state to avoid adding to browser history
            window.history.replaceState({}, "", url.toString());
            console.log(
              `[CodeQualityInsights] Updated URL with recovered developer ID: ${storedDeveloperId}`,
            );
          } catch (e) {
            console.error("[CodeQualityInsights] Failed to update URL:", e);
          }
        }
      }
    } else if (urlDeveloperId && urlDeveloperId !== developerId) {
      // URL parameter takes precedence over state
      setDeveloperId(urlDeveloperId);
    }
  }, [urlDeveloperId, developerId, loadDeveloperIdFromLocalStorage]);

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
  const [analyzedPRsInLastPattern, setAnalyzedPRsInLastPattern] = useState<
    Set<number>
  >(new Set());

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
          `Cleared incompatible model selection (${selectedModel}) for provider ${apiProvider}.`,
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
        "[handleGenerateMetaAnalysis] Cannot generate meta-analysis: API config incomplete.",
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
      const prAnalysisPromises = Array.from(selectedPRIds).map((prId) =>
        cacheService.getPRAnalysis(prId),
      );

      const prAnalysisResults = await Promise.all(prAnalysisPromises);
      const validResults = prAnalysisResults.filter(
        (result) => result && result.feedback,
      ) as PRAnalysisResult[];

      if (validResults.length < 2) {
        throw new Error("Not enough valid PR analysis data available");
      }

      // Generate meta-analysis
      const metaAnalysis = await generateMetaAnalysis(validResults, {
        apiKey,
        provider: apiProvider,
        model: selectedModel,
      });

      setMetaAnalysisResult(metaAnalysis);
      // Reset the outdated flag when new patterns are generated
      setIsPatternsOutdated(false);
      // Store which PRs were included in this pattern analysis
      setAnalyzedPRsInLastPattern(new Set(selectedPRIds));
      // Mark as not from cache since we just generated fresh patterns
      setIsFromCache(false);
      // Store the analyzed PR IDs and timestamp in the meta analysis for future reference
      const metaAnalysisWithMetadata = {
        ...metaAnalysis,
        analyzedPRIds: Array.from(selectedPRIds),
        timestamp: Date.now(),
        developerId: developerId,
      };

      // Cache the pattern analysis result for this developer
      try {
        console.log(
          `[handleGenerateMetaAnalysis] Caching pattern analysis for developer: ${developerId}`,
          metaAnalysisWithMetadata,
        );
        await cacheService.cachePatternAnalysis(
          developerId,
          metaAnalysisWithMetadata,
        );
        // Also save to localStorage as a fallback
        saveLastPatternResultToLocalStorage(metaAnalysisWithMetadata);
        console.log(
          `[handleGenerateMetaAnalysis] Pattern analysis successfully cached for developer: ${developerId}`,
        );
      } catch (cacheError) {
        console.error("Failed to cache pattern analysis:", cacheError);
        // Try to save to localStorage as fallback if IndexedDB fails
        saveLastPatternResultToLocalStorage(metaAnalysisWithMetadata);
      }
    } catch (error) {
      console.error("Failed to generate meta-analysis:", error);
      alert(
        `Failed to generate meta-analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setMetaAnalysisResult(null);
    } finally {
      setIsGeneratingMetaAnalysis(false);
    }
  }, [
    apiKey,
    apiProvider,
    selectedModel,
    selectedPRIds,
    setIsGeneratingMetaAnalysis,
    setMetaAnalysisResult,
  ]);

  // Removed handleGenerateSummary function since we're no longer including Career Development

  // Track the current developer ID for detecting changes and cache status
  const prevDeveloperIdRef = useRef<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);

  // Constants for localStorage keys - Defined outside component to avoid recreation

  // Functions to save/load pattern data from localStorage (as backup for IndexedDB)
  const saveCurrentDeveloperToLocalStorage = useCallback((devId: string) => {
    try {
      // Only save valid developer IDs
      if (devId && devId !== "unknown") {
        localStorage.setItem(DEVELOPER_ID_KEY, devId);
        console.log(
          `[LocalStorageBackup] Saved current developer ID: ${devId}`,
        );
      }
    } catch (e) {
      console.error("[LocalStorageBackup] Error saving developer ID:", e);
    }
  }, []);

  const saveLastPatternResultToLocalStorage = useCallback((pattern: any) => {
    try {
      localStorage.setItem(LAST_PATTERN_RESULT_KEY, JSON.stringify(pattern));
      console.log(
        "[LocalStorageBackup] Saved last pattern result to localStorage",
      );
    } catch (e) {
      console.error("[LocalStorageBackup] Error saving pattern result:", e);
    }
  }, []);

  const loadLastPatternResultFromLocalStorage = useCallback(() => {
    try {
      const savedPattern = localStorage.getItem(LAST_PATTERN_RESULT_KEY);
      if (savedPattern) {
        return JSON.parse(savedPattern);
      }
      return null;
    } catch (e) {
      console.error("[LocalStorageBackup] Error loading pattern result:", e);
      return null;
    }
  }, []);

  // Log the developer ID on mount and changes
  useEffect(() => {
    console.log(
      `[CodeQualityInsights] Component mounted/updated with developerId: ${developerId} (from URL: ${!!urlDeveloperId})`,
    );

    // Save current developer ID for persistence across refreshes
    if (developerId && developerId !== "unknown") {
      saveCurrentDeveloperToLocalStorage(developerId);
    }

    // Check if LocalStorage/IndexedDB are available
    try {
      const testKey = "github-review-storage-test";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      console.log("[CodeQualityInsights] LocalStorage is available");

      if (window.indexedDB) {
        console.log("[CodeQualityInsights] IndexedDB is available");
      } else {
        console.warn("[CodeQualityInsights] IndexedDB is NOT available");
      }
    } catch (e) {
      console.error("[CodeQualityInsights] Storage access error:", e);
    }

    return () => {
      console.log(
        `[CodeQualityInsights] Component unmounting with developerId: ${developerId}`,
      );
    };
  }, [developerId, saveCurrentDeveloperToLocalStorage]);

  // Effect to load cached pattern analysis for the current developer
  useEffect(() => {
    const loadCachedPatternAnalysis = async () => {
      if (!developerId || developerId === "unknown") {
        console.log(
          "[Pattern Cache] No valid developer ID provided, skipping cache load",
        );
        return;
      }

      console.log(
        `[Pattern Cache] Attempting to load cached patterns for developer: ${developerId}`,
      );

      console.log(
        `[Pattern Cache] Starting cache load for developer: ${developerId}`,
      );

      // Check if developer changed
      const developerChanged =
        prevDeveloperIdRef.current !== null &&
        prevDeveloperIdRef.current !== developerId;

      console.log(
        `[Pattern Cache] Developer changed: ${developerChanged}, previous: ${prevDeveloperIdRef.current}, current: ${developerId}`,
      );

      // Update the reference
      prevDeveloperIdRef.current = developerId;

      try {
        console.log(
          `[Pattern Cache] Checking for cached patterns for developer: ${developerId}`,
        );
        let cachedPattern = await cacheService.getPatternAnalysis(developerId);

        // If IndexedDB cache failed, try localStorage fallback
        if (!cachedPattern) {
          console.log(
            `[Pattern Cache] No IndexedDB cache found for ${developerId}, trying localStorage fallback`,
          );
          const localStoragePattern = loadLastPatternResultFromLocalStorage();

          // Only use localStorage pattern if it matches the current developer
          if (
            localStoragePattern &&
            localStoragePattern.developerId === developerId
          ) {
            console.log(
              `[Pattern Cache] Found pattern in localStorage fallback for ${developerId}`,
            );
            cachedPattern = localStoragePattern;
          } else if (localStoragePattern) {
            console.log(
              `[Pattern Cache] Found pattern in localStorage but developer ID mismatch: ${localStoragePattern.developerId} vs ${developerId}`,
            );
          }
        }

        console.log(
          `[Pattern Cache] Cache lookup result:`,
          cachedPattern ? "Found cache" : "No cache found",
        );

        if (cachedPattern) {
          console.log(
            `[Pattern Cache] Found cached pattern analysis for developer: ${developerId}`,
            cachedPattern,
          );
          setMetaAnalysisResult(cachedPattern);
          setIsFromCache(true);

          // If the developer changed, we need to verify if selected PRs match what was in the pattern
          if (developerChanged) {
            console.log(
              `[Pattern Cache] Developer changed, checking if PRs match`,
            );
            // We will check if the PRs match in the next render via the selection effect
            setAnalyzedPRsInLastPattern(
              new Set(cachedPattern.analyzedPRIds || []),
            );
            setIsPatternsOutdated(true);
          } else {
            // Same developer, pattern from cache is initially considered up-to-date
            console.log(
              `[Pattern Cache] Same developer, setting patterns as up-to-date`,
            );
            setIsPatternsOutdated(false);
            setAnalyzedPRsInLastPattern(
              new Set(cachedPattern.analyzedPRIds || []),
            );
          }
        } else {
          console.log(
            `[Pattern Cache] No cached pattern analysis found for developer: ${developerId}`,
          );
          // Clear any existing pattern analysis when switching to a developer with no cache
          if (metaAnalysisResult) {
            console.log(`[Pattern Cache] Clearing existing pattern analysis`);
            setMetaAnalysisResult(null);
            setAnalyzedPRsInLastPattern(new Set());
            setIsFromCache(false);
          }
        }
      } catch (error) {
        console.error(
          `[Pattern Cache] Error loading cached patterns for developer ${developerId}:`,
          error,
        );

        // Try localStorage fallback if primary cache mechanism fails
        try {
          const localStoragePattern = loadLastPatternResultFromLocalStorage();
          if (
            localStoragePattern &&
            localStoragePattern.developerId === developerId
          ) {
            console.log(
              "[Pattern Cache] Using localStorage fallback after cache error",
            );
            setMetaAnalysisResult(localStoragePattern);
            setIsFromCache(true);
            setAnalyzedPRsInLastPattern(
              new Set(localStoragePattern.analyzedPRIds || []),
            );
          }
        } catch (fallbackError) {
          console.error("[Pattern Cache] Fallback also failed:", fallbackError);
        }
      }
    };

    // Run on initial mount and when developer changes
    loadCachedPatternAnalysis();
  }, [
    developerId,
    setMetaAnalysisResult,
    metaAnalysisResult,
    setAnalyzedPRsInLastPattern,
    setIsPatternsOutdated,
    loadLastPatternResultFromLocalStorage,
  ]);

  // Effect for discovering analyzed IDs and setting initial selection on mount
  useEffect(() => {
    // Run only once on initial mount
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    console.log(
      "[Initial ID Discovery Effect] RUNNING - Checking cache for new PRs...",
    );

    const discoverAndSetInitialSelection = async () => {
      let currentKnownIds = Array.from(
        useAnalysisStore.getState().allAnalyzedPRIds,
      );
      console.log(
        `[Initial ID Discovery Effect] Known analyzed IDs before check: ${
          currentKnownIds.join(", ") || "None"
        }`,
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
          } potential new PR IDs: ${prIdsToCheckInCache.join(", ")}`,
        );
        try {
          const cacheResults = await Promise.all(
            prIdsToCheckInCache.map((id) => cacheService.getPRAnalysis(id)),
          );
          newlyFoundCachedIds = cacheResults
            .filter((result) => result !== null)
            .map((result) => result!.prId);

          if (newlyFoundCachedIds.length > 0) {
            console.log(
              `[Initial ID Discovery Effect] Found ${
                newlyFoundCachedIds.length
              } new analyzed PRs in cache. Adding IDs to store: ${newlyFoundCachedIds.join(
                ", ",
              )}`,
            );
            addAnalyzedPRIds(newlyFoundCachedIds); // Add new IDs to store
            // Update our local list of known IDs for the next step
            currentKnownIds = [...currentKnownIds, ...newlyFoundCachedIds];
          } else {
            console.log(
              "[Initial ID Discovery Effect] No new analyzed PRs found in cache.",
            );
          }
        } catch (error) {
          console.error(
            "[Initial ID Discovery Effect] Error checking cache for new PRs:",
            error,
          );
        }
      } else {
        console.log(
          "[Initial ID Discovery Effect] No new PRs to check in cache.",
        );
      }

      // --- Set initial selection ---
      // Select ALL known analyzed PRs initially
      if (currentKnownIds.length > 0) {
        console.log(
          `[Initial ID Discovery Effect] Setting initial selected PRs to ALL known analyzed IDs: ${currentKnownIds.join(
            ", ",
          )}`,
        );
        setSelectedPRIds(currentKnownIds);
      } else {
        console.log(
          `[Initial ID Discovery Effect] No known analyzed PRs found, initial selection is empty.`,
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
      }`,
    );

    const updateThemesForSelection = async () => {
      if (currentSelectedIds.length === 0) {
        console.log(
          "[Selection Change Effect] No PRs selected. Clearing themes.",
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
        `[Selection Change Effect] Fetching data for ${currentSelectedIds.length} selected PRs...`,
      );
      try {
        const results: PRAnalysisResult[] = [];
        for (const id of currentSelectedIds) {
          const result = await cacheService.getPRAnalysis(id);
          if (result) {
            results.push(result);
          } else {
            console.warn(
              `[Selection Change Effect] Could not find cached data for selected PR #${id}`,
            );
          }
        }

        if (results.length > 0) {
          console.log(
            `[Selection Change Effect] Calculating themes for ${results.length} results...`,
          );
          const themes = calculateCommonThemes(results);
          console.log(
            "[Selection Change Effect] Calculated themes:",
            JSON.stringify(themes),
          );
          setCalculatedThemes(themes); // Update store
        } else {
          console.warn(
            "[Selection Change Effect] No valid results found for selected PRs. Clearing themes.",
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
          error,
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
    // and if the current selection differs from what was analyzed before
    if (metaAnalysisResult && !isGeneratingMetaAnalysis) {
      const currentSelection = new Set(selectedPRIds);

      // Check if selection has changed since last pattern analysis
      if (currentSelection.size !== analyzedPRsInLastPattern.size) {
        setIsPatternsOutdated(true);
      } else {
        // Check if any PRs are different between current selection and last analysis
        const anyDifferent =
          Array.from(currentSelection).some(
            (id) => !analyzedPRsInLastPattern.has(id),
          ) ||
          Array.from(analyzedPRsInLastPattern).some(
            (id) => !currentSelection.has(id),
          );
        if (anyDifferent) {
          setIsPatternsOutdated(true);
        }
      }
    }
  }, [
    selectedPRIds,
    setCalculatedThemes,
    metaAnalysisResult,
    isGeneratingMetaAnalysis,
    analyzedPRsInLastPattern,
  ]); // Add necessary dependencies

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
      `Starting manual analysis with Provider: ${apiProvider}, Model: ${selectedModel}`,
    );

    try {
      const prsToConsider = useAllPRs && allPRs ? allPRs : pullRequests;
      // Get current state to filter correctly
      const currentAnalyzedIds = useAnalysisStore.getState().allAnalyzedPRIds;
      const currentAnalyzingIds = useAnalysisStore.getState().analyzingPRIds;

      const prsToAnalyzeNow = prsToConsider
        .filter(
          (pr) =>
            !currentAnalyzedIds.has(pr.id) && !currentAnalyzingIds.has(pr.id),
        )
        .slice(0, maxPRs);

      if (prsToAnalyzeNow.length === 0) {
        alert("All eligible PRs are already analyzed or being analyzed.");
        isAnalyzingRef.current = false;
        return;
      }

      console.log(
        `Attempting to manually analyze ${prsToAnalyzeNow.length} PRs...`,
      );

      const config: AIAnalysisConfig = {
        apiKey,
        provider: apiProvider,
        model: selectedModel,
      };

      const results: PRAnalysisResult[] = await analyzeMultiplePRs(
        prsToAnalyzeNow,
        config,
        maxPRs,
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
            ", ",
          )}`,
        );
        addAnalyzedPRIds(newlyAnalyzedIds); // Add IDs to store

        // Calculate themes ONLY for the newly analyzed PRs
        const newThemes = calculateCommonThemes(successfulResults);
        console.log(
          `[handleAnalyze] Calculated themes for new results:`,
          newThemes,
        );

        // Replace existing themes
        setCalculatedThemes(newThemes);
        console.log("[handleAnalyze] Store updated with new themes.");

        // Mark patterns as outdated if we have meta-analysis results and new PRs were analyzed
        if (metaAnalysisResult) {
          // When new PRs are analyzed, they weren't part of the previous pattern analysis
          const newlyAnalyzedIds = successfulResults.map((r) => r.prId);
          const anyNewPRsInSelection = newlyAnalyzedIds.some((id) =>
            selectedPRIds.has(id),
          );

          if (anyNewPRsInSelection) {
            setIsPatternsOutdated(true);
          }
        }
      } else {
        console.warn(
          "Manual analysis completed, but no successful results to aggregate.",
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
      await cacheService.clearAllPRAnalysis(); // Clear PR analysis from IndexedDB
      await cacheService.clearAllPatternAnalysis(); // Clear pattern analysis from IndexedDB
      clearAnalysisData(); // Clear Zustand store
      console.log("[handleClearCacheAndStore] Cache and store cleared.");
      // Reset local component state
      setAnalyzedPRsInLastPattern(new Set());
      setIsFromCache(false);
      prevDeveloperIdRef.current = null;

      // Clear localStorage backups
      try {
        localStorage.removeItem(LAST_PATTERN_RESULT_KEY);
        // Don't clear the developer ID, it should persist between clearing cache
        console.log(
          "[handleClearCacheAndStore] Cleared localStorage pattern backup",
        );
      } catch (e) {
        console.error(
          "[handleClearCacheAndStore] Error clearing localStorage:",
          e,
        );
      }

      setIsConfigVisible(true); // Show config after clearing
    } catch (error) {
      console.error(
        "[handleClearCacheAndStore] Error clearing cache/store:",
        error,
      );
      alert("Failed to clear cache."); // Inform user
    }
  }, [clearAnalysisData]); // Dependency on store action only

  // Log state just before rendering conditional UI
  console.log(
    `[CodeQualityInsights Render] =========================================`,
  );
  console.log(
    `[CodeQualityInsights Render] isLoading (analyzingPRIds.size > 0): ${isLoading} (size: ${analyzingPRIds.size})`,
  );
  console.log(
    `[CodeQualityInsights Render] isOverallLoading: ${isOverallLoading}`,
  );
  console.log(`[CodeQualityInsights Render] hasApiKey: ${!!apiKey}`);
  console.log(
    `[CodeQualityInsights Render] allAnalyzedPRIds.size: ${allAnalyzedPRIds.size}`,
  );
  console.log(
    `[CodeQualityInsights Render] selectedPRIds.size: ${selectedPRIds.size}`,
  );
  console.log(
    `[CodeQualityInsights Render] commonStrengths.length: ${commonStrengths.length}`,
  );
  console.log(
    `[CodeQualityInsights Render] isConfigVisible: ${isConfigVisible}`,
  );
  console.log(
    `[CodeQualityInsights Render] =========================================`,
  );

  return (
    <div className="sticky top-4 z-10 bg-white dark:bg-gray-900 p-0 rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-md space-y-0 max-h-[calc(100vh-2rem)] overflow-hidden">
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
                </div>
              )}

              {/* Pattern Analysis Results */}
              {metaAnalysisResult ? (
                <div className="mt-0">
                  {isFromCache && !isPatternsOutdated && (
                    <div className="text-right mb-1 p-1 rounded-md">
                      <div className="flex items-center justify-end">
                        <p className="text-xs text-zinc-400 ">
                          Analysis from{" "}
                          {metaAnalysisResult.timestamp
                            ? new Date(
                                metaAnalysisResult.timestamp,
                              ).toLocaleDateString()
                            : "a previous session"}
                        </p>
                      </div>
                    </div>
                  )}
                  {isPatternsOutdated && (
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
                  handleAnalyze={handleAnalyze}
                  maxPRs={maxPRs}
                  hasApiKey={!!apiKey}
                  setIsConfigVisible={setIsConfigVisible}
                  handleMaxPRsChange={handleMaxPRsChange}
                />
              ) : selectedPRIds.size < 2 ? (
                <div className="p-4 mt-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-zinc-900/30 rounded-lg text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    Select at least 2 analyzed PRs to find patterns
                  </p>
                  <button
                    onClick={() =>
                      setSelectedPRIds(Array.from(allAnalyzedPRIds))
                    }
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
      </div>
    </div>
  );
}
