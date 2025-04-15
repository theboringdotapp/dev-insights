import { useState, useCallback, useEffect, useRef } from "react";
import { PullRequestItem } from "../../../lib/types";
import {
  AIAnalysisConfig,
  PRAnalysisResult,
} from "../../../lib/aiAnalysisService";

/**
 * Custom hook to manage PR selection functionality
 */
export function usePRSelection(
  prsToAnalyze: PullRequestItem[],
  allAnalyzedPRIds: number[],
  analyzeMultiplePRs: (
    prs: PullRequestItem[],
    config: AIAnalysisConfig,
    maxPRs: number
  ) => Promise<PRAnalysisResult[]>,
  analysisSummary: unknown | null,
  createConfig: (customApiKey?: string) => AIAnalysisConfig
) {
  // State for selected PRs
  const [selectedPRIds, setSelectedPRIds] = useState<number[]>([]);
  // Ref to track if we've already initialized selectedPRIds
  const initializedRef = useRef(false);
  // Ref to prevent multiple rapid analyses
  const isUpdatingRef = useRef(false);

  // Initialize selected PRs only once when allAnalyzedPRIds changes and selectedPRIds is empty
  useEffect(() => {
    if (
      selectedPRIds.length === 0 &&
      allAnalyzedPRIds.length > 0 &&
      !initializedRef.current
    ) {
      initializedRef.current = true;
      setSelectedPRIds(allAnalyzedPRIds);
    }
  }, [allAnalyzedPRIds, selectedPRIds.length]);

  /**
   * Handles toggling a PR selection
   */
  const togglePR = useCallback(
    (prId: number) => {
      setSelectedPRIds((prev) => {
        // Create the new selection state
        const newSelection = prev.includes(prId)
          ? prev.filter((id) => id !== prId)
          : [...prev, prId];

        // If we have an analysis already, refresh it using the new selection
        if (analysisSummary && !isUpdatingRef.current) {
          isUpdatingRef.current = true;

          // Small delay to ensure state update happens first
          setTimeout(() => {
            // Only get PRs that are now selected (based on new selection, not old selectedPRIds)
            const targetPRs = prsToAnalyze.filter((pr) =>
              newSelection.includes(pr.id)
            );

            if (targetPRs.length > 0) {
              // Refresh analysis with selected PRs
              analyzeMultiplePRs(targetPRs, createConfig(), 0);
            }

            // Reset the updating flag after a delay
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 500);
          }, 100);
        }

        return newSelection;
      });
    },
    [prsToAnalyze, analysisSummary, analyzeMultiplePRs, createConfig]
  );

  /**
   * Selects all analyzed PRs
   */
  const selectAllPRs = useCallback(() => {
    setSelectedPRIds(allAnalyzedPRIds);
  }, [allAnalyzedPRIds]);

  return {
    selectedPRIds,
    setSelectedPRIds,
    togglePR,
    selectAllPRs,
  };
}
