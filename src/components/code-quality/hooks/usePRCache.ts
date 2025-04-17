import { useState, useEffect, useRef, useCallback } from "react";
import { PullRequestItem, PRAnalysisResult } from "../../../lib/types";
import { useAnalysisStore } from "../../../stores/analysisStore";
import {
  AIAnalysisConfig,
  calculateCommonThemes,
  generateAICareerSummary,
} from "../../../lib/aiAnalysisService";
import cacheService from "../../../lib/cacheService";

/**
 * Custom hook to manage PR analysis cache operations
 */
export function usePRCache(
  prsToAnalyze: PullRequestItem[],
  getAnalysisForPR: (prId: number) => Promise<PRAnalysisResult | null>,
  getAnalysisFromMemoryCache: (prId: number) => PRAnalysisResult | null,
  analyzeMultiplePRs: (
    prs: PullRequestItem[],
    config: AIAnalysisConfig,
    maxPRs?: number
  ) => Promise<PRAnalysisResult[]>,
  isAnalyzing: boolean
) {
  // Get state and actions from Zustand store
  const {
    allAnalyzedPRIds,
    addAnalyzedPRIds,
    setCalculatedThemes,
    setCareerDevelopmentSummary,
    setSelectedPRIds,
    clearAnalysisData,
    setIsGeneratingSummary,
  } = useAnalysisStore();

  // Local state specific to this hook
  const [cachedCount, setCachedCount] = useState(0); // Count from persistent cache only
  const [cachedPRIds, setCachedPRIds] = useState<number[]>([]); // IDs from persistent cache check
  const [newlyAnalyzedPRIds, setNewlyAnalyzedPRIds] = useState<number[]>([]);

  // Flag to track if we've auto-shown analysis
  const autoShowCompletedRef = useRef(false);
  // Flag to prevent duplicate cache checks
  const cacheCheckInProgressRef = useRef(false);

  /**
   * Checks for cached PR analyses and updates state
   *
   * If checkOnly is true, it will only check for cached analyses without updating component state
   */
  const checkCachedAnalyses = useCallback(
    async (maxPRs: number, hasApiKey: boolean, checkOnly = false) => {
      if (prsToAnalyze.length === 0 || cacheCheckInProgressRef.current) return;

      // Use store's allAnalyzedPRIds as the source of truth for already known IDs
      const knownAnalyzedIds = new Set(allAnalyzedPRIds);
      cacheCheckInProgressRef.current = true;

      try {
        // Check persistent cache for all PRs not already known to be analyzed
        const cachedIds: number[] = [];
        const allIds: number[] = []; // IDs found in this check

        // Build list of PRs to check in cache
        const prsToCheck = prsToAnalyze.filter(
          (pr) => !knownAnalyzedIds.has(pr.id)
        );

        // Fetch all cached analyses concurrently
        const cacheResults = await Promise.all(
          prsToCheck.map((pr) => cacheService.getPRAnalysis(pr.id))
        );

        cacheResults.forEach((result, index) => {
          if (result) {
            const prId = prsToCheck[index].id;
            cachedIds.push(prId);
            allIds.push(prId);
          }
        });

        const finalCachedCount = cachedIds.length;

        // Update store and local state only if not in check-only mode
        if (!checkOnly) {
          if (allIds.length > 0) {
            // Add the newly found cached IDs to the store
            addAnalyzedPRIds(allIds);
          }

          // Update local state for cached count/ids from this specific check
          setCachedCount(finalCachedCount);
          setCachedPRIds(cachedIds);
        }

        // Return the result of this specific check
        return { count: finalCachedCount, cachedIds };
      } finally {
        cacheCheckInProgressRef.current = false;
      }
    },
    [prsToAnalyze, getAnalysisForPR, addAnalyzedPRIds, allAnalyzedPRIds]
  );

  /**
   * Auto-shows analysis for cached PRs
   */
  const autoShowAnalysis = useCallback(
    async (prs: PullRequestItem[], config: AIAnalysisConfig) => {
      if (prs.length === 0 || autoShowCompletedRef.current) return;

      autoShowCompletedRef.current = true;
      setIsGeneratingSummary(true); // Indicate summary generation started

      try {
        // Analyze these PRs (even if cached, to get fresh data/summary)
        const results = await analyzeMultiplePRs(prs, config, prs.length);

        if (results && results.length > 0) {
          // Calculate common themes and score
          const themes = calculateCommonThemes(results);
          // Update store themes
          setCalculatedThemes(themes);

          // Generate the career summary based on themes
          const summary = await generateAICareerSummary(themes, config);
          // Update store summary
          setCareerDevelopmentSummary(summary);

          // Select these PRs in the store
          setSelectedPRIds(results.map((r) => r.prId));
        } else {
          // Handle case where analysis yields no results (optional: clear themes/summary)
          setCalculatedThemes({
            commonStrengths: [],
            commonWeaknesses: [],
            commonSuggestions: [],
            averageScore: 0,
          });
          setCareerDevelopmentSummary(null);
          console.log("Auto-analysis yielded no results.");
        }
      } catch (error) {
        console.error("Error during autoShowAnalysis:", error);
        // Clear summary/themes on error
        setCalculatedThemes({
          commonStrengths: [],
          commonWeaknesses: [],
          commonSuggestions: [],
          averageScore: 0,
        });
        setCareerDevelopmentSummary(
          "Error generating analysis summary. Please try again."
        );
      } finally {
        setIsGeneratingSummary(false); // Indicate summary generation finished
      }
    },
    [
      analyzeMultiplePRs,
      setCalculatedThemes,
      setCareerDevelopmentSummary,
      setSelectedPRIds,
      setIsGeneratingSummary,
    ]
  );

  /**
   * Clears all PR analysis cache
   */
  const clearAnalysisCache = useCallback(async () => {
    if (isAnalyzing) return false;

    try {
      // Clear the cache
      await cacheService.clearAllPRAnalysis();

      // Reset states
      clearAnalysisData(); // Clear zustand store
      setCachedCount(0);
      setCachedPRIds([]);
      setNewlyAnalyzedPRIds([]);

      // Reset refs
      autoShowCompletedRef.current = false;

      return true;
    } catch (error) {
      console.error("Error clearing cache:", error);
      return false;
    }
  }, [isAnalyzing, clearAnalysisData]);

  // Reset auto-show flag when the component unmounts
  useEffect(() => {
    return () => {
      autoShowCompletedRef.current = false;
      cacheCheckInProgressRef.current = false;
    };
  }, []);

  return {
    cachedCount,
    cachedPRIds,
    allAnalyzedPRIds,
    addAnalyzedPRIds,
    setCalculatedThemes,
    setCareerDevelopmentSummary,
    setSelectedPRIds,
    clearAnalysisData,
    newlyAnalyzedPRIds,
    setNewlyAnalyzedPRIds,
    autoShowCompletedRef,
    checkCachedAnalyses,
    autoShowAnalysis,
    clearAnalysisCache,
  };
}
