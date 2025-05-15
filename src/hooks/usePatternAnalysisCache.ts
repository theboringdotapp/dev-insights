import { useState, useRef, useEffect } from "react";
import {
  CachedMetaAnalysisResult,
  loadPatternResultFromLocalStorage,
  savePatternResultToLocalStorage,
  LAST_PATTERN_RESULT_KEY,
} from "../lib/localStorageUtils";
import cacheService from "../lib/cacheService";
import { useAnalysisStore } from "../stores/analysisStore";

interface UsePatternAnalysisCacheProps {
  developerId: string;
}

interface UsePatternAnalysisCacheResult {
  metaAnalysisResult: CachedMetaAnalysisResult | null;
  isFromCache: boolean;
  isPatternsOutdated: boolean;
  analyzedPRsInLastPattern: Set<number>;
  setMetaAnalysisResult: (result: CachedMetaAnalysisResult | null) => void;
  setIsPatternsOutdated: (isOutdated: boolean) => void;
  setAnalyzedPRsInLastPattern: (prs: Set<number>) => void;
  cachePatternAnalysis: (result: CachedMetaAnalysisResult) => Promise<void>;
  clearPatternCache: () => Promise<void>;
}

/**
 * Custom hook for managing pattern analysis cache.
 * Handles loading from IndexedDB and localStorage, tracking outdated state,
 * and caching new pattern analysis results.
 */
export function usePatternAnalysisCache({
  developerId,
}: UsePatternAnalysisCacheProps): UsePatternAnalysisCacheResult {
  // State for pattern analysis results
  const [metaAnalysisResult, setMetaAnalysisResult] =
    useState<CachedMetaAnalysisResult | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [isPatternsOutdated, setIsPatternsOutdated] = useState<boolean>(false);
  const [analyzedPRsInLastPattern, setAnalyzedPRsInLastPattern] = useState<
    Set<number>
  >(new Set());

  // Get selected PRs and all analyzed PRs from the store
  const { selectedPRIds, allAnalyzedPRIds } = useAnalysisStore();

  // Ref to track previous developer ID for change detection
  const prevDeveloperIdRef = useRef<string | null>(null);

  // Ref to track previously analyzed PRs for change detection
  const prevAnalyzedPRsRef = useRef<Set<number>>(new Set());

  /**
   * Effect to check if patterns are outdated when analyzed PRs change
   */
  useEffect(() => {
    // Debug logging
    console.log(
      `[Pattern Cache Debug] Running check effect - metaAnalysisResult: ${!!metaAnalysisResult}, analyzedPRsInLastPattern.size: ${
        analyzedPRsInLastPattern.size
      }, selectedPRIds.size: ${
        Array.from(selectedPRIds).length
      }, allAnalyzedPRIds.size: ${Array.from(allAnalyzedPRIds).length}`
    );

    // Only check if we have an existing meta analysis result
    if (metaAnalysisResult && analyzedPRsInLastPattern.size > 0) {
      // Convert sets to arrays for comparison
      const lastPatternPRs = Array.from(analyzedPRsInLastPattern);
      const currentSelectedPRs = Array.from(selectedPRIds);
      const currentAnalyzedPRs = Array.from(allAnalyzedPRIds);

      console.log(
        `[Pattern Cache Debug] Detailed comparison - lastPatternPRs: [${lastPatternPRs.join(
          ", "
        )}], currentSelectedPRs: [${currentSelectedPRs.join(
          ", "
        )}], currentAnalyzedPRs: [${currentAnalyzedPRs.join(", ")}]`
      );

      // Check if new PRs have been analyzed since the last pattern generation
      const hasNewAnalyzedPRs = currentAnalyzedPRs.some(
        (prId) => !prevAnalyzedPRsRef.current.has(prId)
      );

      // Check if the selection has changed
      const selectionChanged =
        // Different count of selected PRs
        currentSelectedPRs.length !== lastPatternPRs.length ||
        // Or different PRs in selection
        currentSelectedPRs.some(
          (prId) => !analyzedPRsInLastPattern.has(prId)
        ) ||
        // Or selected PRs include newly analyzed ones
        hasNewAnalyzedPRs;

      console.log(
        `[Pattern Cache Debug] hasNewAnalyzedPRs: ${hasNewAnalyzedPRs}, selectionChanged: ${selectionChanged}, current isPatternsOutdated: ${isPatternsOutdated}`
      );

      // Update patterns outdated state if needed
      if (selectionChanged) {
        console.log(
          "[Pattern Cache] Pattern is outdated: selection changed or new PRs analyzed"
        );
        setIsPatternsOutdated(true);
      }

      // Update the ref with current analyzed PRs
      prevAnalyzedPRsRef.current = new Set(currentAnalyzedPRs);
    } else if (metaAnalysisResult) {
      // This handles the case where we have a meta analysis but no analyzedPRsInLastPattern set yet
      // This can happen if the meta analysis was loaded from cache but the analyzedPRsInLastPattern wasn't properly set
      console.log(
        "[Pattern Cache] Meta analysis exists but no analyzedPRsInLastPattern, initializing from cached data"
      );
      if (
        metaAnalysisResult.analyzedPRIds &&
        metaAnalysisResult.analyzedPRIds.length > 0
      ) {
        setAnalyzedPRsInLastPattern(new Set(metaAnalysisResult.analyzedPRIds));
      }
    }
  }, [
    allAnalyzedPRIds,
    selectedPRIds,
    metaAnalysisResult,
    analyzedPRsInLastPattern,
    setIsPatternsOutdated,
    setAnalyzedPRsInLastPattern,
    isPatternsOutdated,
  ]);

  /**
   * Load pattern analysis from cache
   */
  useEffect(() => {
    const loadCachedPatternAnalysis = async () => {
      if (!developerId || developerId === "unknown") {
        console.log(
          "[Pattern Cache] No valid developer ID provided, skipping cache load"
        );
        return;
      }

      console.log(
        `[Pattern Cache] Attempting to load cached patterns for developer: ${developerId}`
      );

      // Check if developer changed
      const developerChanged =
        prevDeveloperIdRef.current !== null &&
        prevDeveloperIdRef.current !== developerId;
      console.log(
        `[Pattern Cache] Developer changed: ${developerChanged}, previous: ${prevDeveloperIdRef.current}, current: ${developerId}`
      );

      // Update the reference
      prevDeveloperIdRef.current = developerId;

      try {
        console.log(
          `[Pattern Cache] Checking for cached patterns for developer: ${developerId}`
        );
        let cachedPattern = await cacheService.getPatternAnalysis(developerId);

        // If IndexedDB cache failed, try localStorage fallback
        if (!cachedPattern) {
          console.log(
            `[Pattern Cache] No IndexedDB cache found for ${developerId}, trying localStorage fallback`
          );
          const localStoragePattern = loadPatternResultFromLocalStorage();

          // Only use localStorage pattern if it matches the current developer
          if (
            localStoragePattern &&
            localStoragePattern.developerId === developerId
          ) {
            console.log(
              `[Pattern Cache] Found pattern in localStorage fallback for ${developerId}`
            );
            cachedPattern = localStoragePattern;
          } else if (localStoragePattern) {
            console.log(
              `[Pattern Cache] Found pattern in localStorage but developer ID mismatch: ${localStoragePattern.developerId} vs ${developerId}`
            );
          }
        }

        console.log(
          `[Pattern Cache] Cache lookup result:`,
          cachedPattern ? "Found cache" : "No cache found"
        );

        if (cachedPattern) {
          console.log(
            `[Pattern Cache] Found cached pattern analysis for developer: ${developerId}`,
            cachedPattern
          );
          setMetaAnalysisResult(cachedPattern);
          setIsFromCache(true);

          // Store the PRs that were analyzed in the pattern
          const patternPRIds = new Set(cachedPattern.analyzedPRIds || []);
          // Explicitly cast to the expected type
          const typedPRIds = new Set<number>(
            (cachedPattern.analyzedPRIds || []).filter(
              (id) => typeof id === "number"
            )
          );
          setAnalyzedPRsInLastPattern(typedPRIds);

          // Initialize the ref with the current analyzed PRs
          prevAnalyzedPRsRef.current = new Set(Array.from(allAnalyzedPRIds));

          // If the developer changed, pattern is considered outdated
          if (developerChanged) {
            console.log(
              `[Pattern Cache] Developer changed, setting patterns as outdated`
            );
            setIsPatternsOutdated(true);
          } else {
            // Check if selection has changed since the pattern was generated
            const currentSelectedPRs = Array.from(selectedPRIds);
            const lastPatternPRs = Array.from(patternPRIds);

            const selectionChanged =
              // Different count of selected PRs
              currentSelectedPRs.length !== lastPatternPRs.length ||
              // Or different PRs in selection
              currentSelectedPRs.some((prId) => !patternPRIds.has(prId));

            console.log(
              `[Pattern Cache] Selection changed: ${selectionChanged}`
            );
            setIsPatternsOutdated(selectionChanged);
          }
        } else {
          console.log(
            `[Pattern Cache] No cached pattern analysis found for developer: ${developerId}`
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
          error
        );

        // Try localStorage fallback if primary cache mechanism fails
        try {
          const localStoragePattern = loadPatternResultFromLocalStorage();
          if (
            localStoragePattern &&
            localStoragePattern.developerId === developerId
          ) {
            console.log(
              "[Pattern Cache] Using localStorage fallback after cache error"
            );
            setMetaAnalysisResult(localStoragePattern);
            setIsFromCache(true);
            setAnalyzedPRsInLastPattern(
              new Set(localStoragePattern.analyzedPRIds || [])
            );
          }
        } catch (fallbackError) {
          console.error("[Pattern Cache] Fallback also failed:", fallbackError);
        }
      }
    };

    loadCachedPatternAnalysis();
  }, [developerId, selectedPRIds, allAnalyzedPRIds]);

  /**
   * Cache a new pattern analysis result
   */
  const cachePatternAnalysis = async (
    result: CachedMetaAnalysisResult
  ): Promise<void> => {
    if (!developerId || developerId === "unknown") {
      console.warn(
        "[Pattern Cache] No valid developer ID provided, skipping cache save"
      );
      return;
    }

    try {
      // Add metadata to the result
      const resultWithMetadata: CachedMetaAnalysisResult = {
        ...result,
        timestamp: Date.now(),
        developerId,
      };

      console.log(
        `[Pattern Cache] Caching pattern analysis for developer: ${developerId}`,
        resultWithMetadata
      );

      // Ensure the analyzedPRIds field is present
      if (
        !resultWithMetadata.analyzedPRIds ||
        resultWithMetadata.analyzedPRIds.length === 0
      ) {
        console.warn(
          "[Pattern Cache] Result doesn't contain analyzedPRIds, using current selection"
        );
        resultWithMetadata.analyzedPRIds = Array.from(selectedPRIds);
      }

      // Cache in IndexedDB
      await cacheService.cachePatternAnalysis(developerId, resultWithMetadata);

      // Also save to localStorage as a fallback
      savePatternResultToLocalStorage(resultWithMetadata);

      console.log(
        `[Pattern Cache] Pattern analysis successfully cached for developer: ${developerId}`
      );

      // Update state
      setMetaAnalysisResult(resultWithMetadata);
      setIsFromCache(true);
      setIsPatternsOutdated(false); // Explicitly reset this flag

      // Store the current PRs that were analyzed in this pattern
      console.log(
        `[Pattern Cache] Setting analyzedPRsInLastPattern to: [${resultWithMetadata.analyzedPRIds.join(
          ", "
        )}]`
      );
      setAnalyzedPRsInLastPattern(
        new Set(resultWithMetadata.analyzedPRIds || [])
      );

      // Update the ref with current analyzed PRs
      prevAnalyzedPRsRef.current = new Set(Array.from(allAnalyzedPRIds));
    } catch (error) {
      console.error("[Pattern Cache] Failed to cache pattern analysis:", error);

      // Try to save to localStorage as fallback if IndexedDB fails
      if (result) {
        const resultWithMetadata: CachedMetaAnalysisResult = {
          ...result,
          timestamp: Date.now(),
          developerId,
        };
        savePatternResultToLocalStorage(resultWithMetadata);
      }
    }
  };

  /**
   * Clear all pattern cache for testing or resetting
   */
  const clearPatternCache = async (): Promise<void> => {
    try {
      console.log("[Pattern Cache] Clearing pattern cache...");

      // Clear from state
      setMetaAnalysisResult(null);
      setIsFromCache(false);
      setIsPatternsOutdated(false);
      setAnalyzedPRsInLastPattern(new Set());

      // Clear from IndexedDB
      await cacheService.clearAllPatternAnalysis();

      // Clear from localStorage
      try {
        localStorage.removeItem(LAST_PATTERN_RESULT_KEY);
      } catch (localStorage_error) {
        console.error(
          "[Pattern Cache] Error clearing pattern from localStorage:",
          localStorage_error
        );
      }

      console.log("[Pattern Cache] Pattern cache cleared successfully");
    } catch (error) {
      console.error("[Pattern Cache] Error clearing pattern cache:", error);
    }
  };

  return {
    metaAnalysisResult,
    isFromCache,
    isPatternsOutdated,
    analyzedPRsInLastPattern,
    setMetaAnalysisResult,
    setIsPatternsOutdated,
    setAnalyzedPRsInLastPattern,
    cachePatternAnalysis,
    clearPatternCache,
  };
}
