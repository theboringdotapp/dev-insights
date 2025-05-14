import { useState, useRef, useEffect } from "react";
import {
  CachedMetaAnalysisResult,
  loadPatternResultFromLocalStorage,
  savePatternResultToLocalStorage,
  LAST_PATTERN_RESULT_KEY,
} from "../lib/localStorageUtils";
import cacheService from "../lib/cacheService";

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

  // Ref to track previous developer ID for change detection
  const prevDeveloperIdRef = useRef<string | null>(null);

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

          // If the developer changed, we need to verify if selected PRs match what was in the pattern
          if (developerChanged) {
            console.log(
              `[Pattern Cache] Developer changed, checking if PRs match`
            );
            setAnalyzedPRsInLastPattern(
              new Set(cachedPattern.analyzedPRIds || [])
            );
            setIsPatternsOutdated(true);
          } else {
            // Same developer, pattern from cache is initially considered up-to-date
            console.log(
              `[Pattern Cache] Same developer, setting patterns as up-to-date`
            );
            setIsPatternsOutdated(false);
            setAnalyzedPRsInLastPattern(
              new Set(cachedPattern.analyzedPRIds || [])
            );
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
  }, [developerId, metaAnalysisResult]);

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
      setIsPatternsOutdated(false);
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
        console.log("[Pattern Cache] Cleared localStorage pattern backup");
      } catch (e) {
        console.error("[Pattern Cache] Error clearing localStorage:", e);
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
