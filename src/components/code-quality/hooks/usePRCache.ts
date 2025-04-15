import { useState, useEffect, useRef, useCallback } from "react";
import { PullRequestItem } from "../../../lib/types";
import {
  AIAnalysisConfig,
  PRAnalysisResult,
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
    maxPRs: number
  ) => Promise<PRAnalysisResult[]>,
  isAnalyzing: boolean,
  analysisSummary: unknown,
  apiProvider: string,
  apiKey?: string
) {
  // State for cached PRs
  const [cachedCount, setCachedCount] = useState(0);
  const [cachedPRIds, setCachedPRIds] = useState<number[]>([]);
  const [allAnalyzedPRIds, setAllAnalyzedPRIds] = useState<number[]>([]);
  const [newlyAnalyzedPRIds, setNewlyAnalyzedPRIds] = useState<number[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

      cacheCheckInProgressRef.current = true;

      try {
        let count = 0;
        const cachedIds: number[] = [];
        const allIds: number[] = [];

        // First check top N PRs for cache status
        for (const pr of prsToAnalyze.slice(0, maxPRs)) {
          const isAnalyzed = await getAnalysisForPR(pr.id);
          if (isAnalyzed) {
            count++;
            cachedIds.push(pr.id);
            allIds.push(pr.id);
          }
        }

        // Then check all PRs for any that are analyzed
        for (const pr of prsToAnalyze.slice(maxPRs)) {
          const isAnalyzed = await getAnalysisForPR(pr.id);
          if (isAnalyzed) {
            allIds.push(pr.id);
          }
        }

        // Only update state if not in check-only mode
        if (!checkOnly) {
          setCachedCount(count);
          setCachedPRIds(cachedIds);
          setAllAnalyzedPRIds(allIds);
        }

        if (hasApiKey) {
          return { count, cachedIds, allIds };
        }
        return undefined;
      } finally {
        cacheCheckInProgressRef.current = false;
      }
    },
    [prsToAnalyze, getAnalysisForPR, setAllAnalyzedPRIds]
  );

  /**
   * Auto-shows analysis for cached PRs
   */
  const autoShowAnalysis = useCallback(
    (prs: PullRequestItem[], config: AIAnalysisConfig) => {
      if (prs.length === 0 || autoShowCompletedRef.current) return;

      // Mark that we've auto-shown the analysis to prevent recurring calls
      autoShowCompletedRef.current = true;

      // Show cached analyses without making new API calls
      return analyzeMultiplePRs(prs, config, 0);
    },
    [analyzeMultiplePRs]
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
      setCachedCount(0);
      setCachedPRIds([]);
      setAllAnalyzedPRIds([]);
      setNewlyAnalyzedPRIds([]);

      // Force a component refresh to clear the analysis display
      setRefreshTrigger((prev) => prev + 1);

      // Reset refs
      autoShowCompletedRef.current = false;

      return true;
    } catch (error) {
      console.error("Error clearing cache:", error);
      return false;
    }
  }, [isAnalyzing]);

  /**
   * Creates a config object with API key
   */
  const createConfig = useCallback(
    (customApiKey?: string): AIAnalysisConfig => {
      const OPENAI_KEY_STORAGE = "github-review-openai-key";
      const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";

      return {
        apiKey:
          customApiKey ||
          apiKey ||
          localStorage.getItem(OPENAI_KEY_STORAGE) ||
          localStorage.getItem(ANTHROPIC_KEY_STORAGE) ||
          "",
        provider: apiProvider as "openai" | "anthropic",
      };
    },
    [apiKey, apiProvider]
  );

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
    setAllAnalyzedPRIds,
    newlyAnalyzedPRIds,
    setNewlyAnalyzedPRIds,
    refreshTrigger,
    setRefreshTrigger,
    autoShowCompletedRef,
    checkCachedAnalyses,
    autoShowAnalysis,
    clearAnalysisCache,
    createConfig,
  };
}
