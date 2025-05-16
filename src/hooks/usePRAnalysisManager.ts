import { useCallback, useRef } from "react";
import { PullRequestItem, PRAnalysisResult } from "../lib/types";
import { useAnalysisStore } from "../stores/analysisStore";
import { usePRMetrics } from "../lib/usePRMetrics";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";

interface UsePRAnalysisManagerProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  useAllPRs: boolean;
  maxPRs: number;
  setIsPatternsOutdated?: (isOutdated: boolean) => void;
}

interface UsePRAnalysisManagerResult {
  handleAnalyze: (apiConfig: AIAnalysisConfig) => Promise<void>;
  isAnalyzing: boolean;
}

/**
 * Custom hook to manage PR analysis operations
 */
export function usePRAnalysisManager({
  pullRequests,
  allPRs,
  useAllPRs,
  maxPRs,
  setIsPatternsOutdated,
}: UsePRAnalysisManagerProps): UsePRAnalysisManagerResult {
  // Core metrics hook
  const { analyzeMultiplePRs } = usePRMetrics();

  // Get state and actions from store
  const {
    addAnalyzedPRIds,
    selectedPRIds,
    setSelectedPRIds,
    metaAnalysisResult,
  } = useAnalysisStore();

  // Ref to prevent duplicate analysis calls
  const isAnalyzingRef = useRef(false);

  // Function to handle PR analysis
  const handleAnalyze = useCallback(
    async (apiConfig: AIAnalysisConfig) => {
      if (isAnalyzingRef.current) {
        console.log("[usePRAnalysisManager] Analysis already in progress.");
        return;
      }

      if (!apiConfig.apiKey || !apiConfig.model) {
        console.error("[usePRAnalysisManager] API key or model not selected.");
        throw new Error("API configuration incomplete");
      }

      isAnalyzingRef.current = true;

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
          console.log("[usePRAnalysisManager] No PRs to analyze");
          isAnalyzingRef.current = false;
          throw new Error(
            "All eligible PRs are already analyzed or being analyzed"
          );
        }

        console.log(
          `[usePRAnalysisManager] Analyzing ${prsToAnalyzeNow.length} PRs...`
        );

        const results: PRAnalysisResult[] = await analyzeMultiplePRs(
          prsToAnalyzeNow,
          apiConfig,
          maxPRs
        );

        const successfulResults = results.filter((res) => !res.error);
        if (successfulResults.length > 0) {
          // Get IDs of successfully analyzed PRs
          const newlyAnalyzedIds = successfulResults.map((r) => r.prId);
          console.log(
            `[usePRAnalysisManager] Adding ${newlyAnalyzedIds.length} new analyzed IDs to store`
          );
          addAnalyzedPRIds(newlyAnalyzedIds);

          // Also select the newly analyzed PRs
          const currentSelection = Array.from(selectedPRIds);
          const updatedSelection = [...currentSelection, ...newlyAnalyzedIds];
          setSelectedPRIds(updatedSelection);

          // Mark patterns as outdated if we have meta-analysis results and new PRs were analyzed
          if (metaAnalysisResult && setIsPatternsOutdated) {
            // When new PRs are analyzed, they weren't part of the previous pattern analysis
            const anyNewPRsInSelection = newlyAnalyzedIds.some((id) =>
              selectedPRIds.has(id)
            );

            if (anyNewPRsInSelection) {
              console.log(
                "[usePRAnalysisManager] Marking patterns as outdated due to new PR analysis"
              );
              setIsPatternsOutdated(true);
            }
          }

          return;
        } else {
          console.warn(
            "[usePRAnalysisManager] No successful results from analysis"
          );
          throw new Error("No PRs were successfully analyzed");
        }
      } catch (error) {
        console.error("[usePRAnalysisManager] Error during analysis:", error);
        throw error;
      } finally {
        isAnalyzingRef.current = false;
      }
    },
    [
      pullRequests,
      allPRs,
      useAllPRs,
      maxPRs,
      analyzeMultiplePRs,
      addAnalyzedPRIds,
      selectedPRIds,
      setSelectedPRIds,
      metaAnalysisResult,
      setIsPatternsOutdated,
    ]
  );

  return {
    handleAnalyze,
    isAnalyzing: isAnalyzingRef.current,
  };
}
