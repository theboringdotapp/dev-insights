import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useDeveloperContext } from "../contexts/DeveloperContext";
import {
  AIAnalysisConfig,
  calculateCommonThemes,
} from "../lib/aiAnalysisService";
import cacheService from "../lib/cacheService";
import { PRAnalysisResult, PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import { useAPIConfiguration } from "./useAPIConfiguration";

export function usePRAnalysis(pullRequests: PullRequestItem[]) {
  const { analyzeAdditionalPR, getAnalysisForPR, getAnalysisFromMemoryCache } =
    usePRMetrics();

  const {
    analyzingPRIds,
    allAnalyzedPRIds,
    addAnalyzedPRIds,
    toggleSelectedPR,
    apiProvider,
    selectedModel,
    failAnalysis,
    setCalculatedThemes,
  } = useAnalysisStore();

  const { apiKey } = useAPIConfiguration();
  const { developerId } = useDeveloperContext();
  const hasApiKey = !!apiKey;
  console.log(
    `[usePRAnalysis] Rendering. apiKey: '${apiKey}', derived hasApiKey: ${hasApiKey}`
  );

  // Check for cached PR analyses when component mounts or PRs change
  useEffect(() => {
    const checkCachedPRs = async () => {
      const foundCachedIds: number[] = [];

      for (const pr of pullRequests) {
        if (!allAnalyzedPRIds.has(pr.id)) {
          const isAnalyzed = await getAnalysisForPR(pr.id);
          if (isAnalyzed) {
            foundCachedIds.push(pr.id);
          }
        }
      }

      if (foundCachedIds.length > 0) {
        addAnalyzedPRIds(foundCachedIds);
      }
    };

    checkCachedPRs();
  }, [pullRequests, getAnalysisForPR, allAnalyzedPRIds, addAnalyzedPRIds]);

  // Function to handle analyzing a single PR
  const handleAnalyzePR = useCallback(
    async (pr: PullRequestItem) => {
      if (analyzingPRIds.has(pr.id)) {
        console.log(`PR #${pr.id} is already being analyzed.`);
        return;
      }

      if (!apiKey || !apiProvider || !selectedModel) {
        toast.error("API Configuration Required", {
          description:
            "Please select an AI provider, model, and enter your API key in the AI Code Quality Insights section first.",
          duration: 5000,
        });
        return;
      }

      const config: AIAnalysisConfig = {
        apiKey,
        provider: apiProvider,
        model: selectedModel,
      };

      const wasPreviouslyAnalyzed = allAnalyzedPRIds.has(pr.id);

      try {
        const result = await analyzeAdditionalPR(pr, config);

        if (result) {
          // Only add to analyzed PRs if analysis succeeded
          if (!wasPreviouslyAnalyzed) {
            addAnalyzedPRIds([pr.id]);
          }
          toggleSelectedPR(pr.id);

          console.log(
            `[handleAnalyzePR] Analysis complete for PR #${pr.id}. Recalculating themes...`
          );

          const currentAnalyzedIds =
            useAnalysisStore.getState().allAnalyzedPRIds;
          console.log(
            `[handleAnalyzePR] All known analyzed IDs for theme recalc:`,
            Array.from(currentAnalyzedIds)
          );

          const allAnalyzedDataPromises = Array.from(currentAnalyzedIds).map(
            (id) => getAnalysisForPR(id)
          );
          const allAnalyzedResults = await Promise.all(allAnalyzedDataPromises);
          console.log(
            `[handleAnalyzePR] Results fetched for theme recalc (includes nulls):`,
            allAnalyzedResults
          );

          const successfulResults = allAnalyzedResults.filter(
            (res): res is PRAnalysisResult => !!res && !res.error
          );
          const successfulResultIds = successfulResults.map((res) => res.prId);
          console.log(
            `[handleAnalyzePR] Successful results used for theme recalc (Count: ${
              successfulResults.length
            }, IDs: ${successfulResultIds.join(", ") || "None"}):`,
            successfulResults
          );

          if (successfulResults.length > 0) {
            // Calculate themes ONLY
            const themes = calculateCommonThemes(successfulResults);
            console.log(`[handleAnalyzePR] Calculated themes:`, themes);
            // Update store with themes/score
            setCalculatedThemes(themes);
            // DO NOT generate AI summary here
          } else {
            console.warn(
              `[handleAnalyzePR] No successful results to calculate themes from.`
            );
            // Clear previous themes if analysis failed?
            // setCalculatedThemes({ commonStrengths: [], commonWeaknesses: [], commonSuggestions: [], averageScore: 0 });
          }
        } else {
          // Analysis failed - show error but don't mark as analyzed
          console.warn(`Analysis failed for PR #${pr.number}`);
          failAnalysis(pr.id);

          // The error toast is already shown by analyzeAdditionalPR/analyzePRCode
          // so we don't need to show another one here
        }
      } catch (error) {
        console.error(`Error in handleAnalyzePR for PR #${pr.number}:`, error);
        failAnalysis(pr.id);

        // Show detailed error toast
        let errorMessage = "An unknown error occurred during analysis";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        toast.error(`Analysis Error (PR #${pr.number})`, {
          description: errorMessage,
          duration: 7000,
        });
      }
    },
    [
      analyzingPRIds,
      apiKey,
      apiProvider,
      selectedModel,
      allAnalyzedPRIds,
      analyzeAdditionalPR,
      addAnalyzedPRIds,
      toggleSelectedPR,
      failAnalysis,
      getAnalysisForPR,
      setCalculatedThemes,
    ]
  );

  // Function to handle re-analyzing a PR
  const handleReanalyzePR = useCallback(
    async (pr: PullRequestItem) => {
      if (analyzingPRIds.has(pr.id)) {
        console.log(`PR #${pr.id} is already being analyzed.`);
        return;
      }

      if (!apiKey || !apiProvider || !selectedModel) {
        toast.error("API Configuration Required", {
          description:
            "Please select an AI provider, model, and enter your API key in the AI Code Quality Insights section first.",
          duration: 5000,
        });
        return;
      }

      try {
        console.log(`Clearing cache for PR #${pr.id} before re-analysis.`);
        await cacheService.deletePRAnalysis(pr.id, developerId);

        const config: AIAnalysisConfig = {
          apiKey,
          provider: apiProvider,
          model: selectedModel,
        };

        const result = await analyzeAdditionalPR(pr, config);

        if (result) {
          // Only add to analyzed PRs if re-analysis succeeded
          addAnalyzedPRIds([pr.id]);
          toggleSelectedPR(pr.id);

          const currentAnalyzedIds =
            useAnalysisStore.getState().allAnalyzedPRIds;
          const allAnalyzedDataPromises = Array.from(currentAnalyzedIds).map(
            (id) => getAnalysisForPR(id)
          );
          const allAnalyzedResults = await Promise.all(allAnalyzedDataPromises);
          const successfulResults = allAnalyzedResults.filter(
            (res): res is PRAnalysisResult => !!res && !res.error
          );

          if (successfulResults.length > 0) {
            // Calculate themes ONLY
            const themes = calculateCommonThemes(successfulResults);
            console.log(`[handleReanalyzePR] Calculated themes:`, themes);
            // Update store with themes/score
            setCalculatedThemes(themes);
            // DO NOT generate AI summary here
          } else {
            console.warn(
              `[handleReanalyzePR] No successful results to calculate themes from.`
            );
            // Clear previous themes?
            // setCalculatedThemes({ commonStrengths: [], commonWeaknesses: [], commonSuggestions: [], averageScore: 0 });
          }
        } else {
          console.warn(`Re-analysis failed for PR #${pr.number}`);
          failAnalysis(pr.id);

          // The error toast is already shown by analyzeAdditionalPR/analyzePRCode
        }
      } catch (error) {
        console.error(`Error re-analyzing PR #${pr.number}:`, error);
        failAnalysis(pr.id);

        // Show detailed error toast
        let errorMessage = "An unknown error occurred during re-analysis";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        toast.error(`Re-analysis Error (PR #${pr.number})`, {
          description: errorMessage,
          duration: 7000,
        });
      }
    },
    [
      analyzingPRIds,
      apiKey,
      apiProvider,
      selectedModel,
      analyzeAdditionalPR,
      addAnalyzedPRIds,
      toggleSelectedPR,
      failAnalysis,
      getAnalysisForPR,
      setCalculatedThemes,
      developerId,
    ]
  );

  // Check if a PR has been analyzed
  const isPRAnalyzed = useCallback(
    (prId: number): boolean => {
      return allAnalyzedPRIds.has(prId) || !!getAnalysisFromMemoryCache(prId);
    },
    [allAnalyzedPRIds, getAnalysisFromMemoryCache]
  );

  // Determine if a PR is currently being analyzed (either locally or by another component)
  const isAnalyzingPR = useCallback(
    (prId: number): boolean => {
      return analyzingPRIds.has(prId);
    },
    [analyzingPRIds]
  );

  return {
    hasApiKey,
    analyzingPRIds,
    isAnalyzingPR,
    isPRAnalyzed,
    handleAnalyzePR,
    handleReanalyzePR,
  };
}
