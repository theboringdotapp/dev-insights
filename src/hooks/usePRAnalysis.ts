import { useEffect, useCallback, useState } from "react";
import { PullRequestItem, PRAnalysisResult } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import { AIAnalysisConfig, aggregateFeedback } from "../lib/aiAnalysisService";
import cacheService from "../lib/cacheService";
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
    setAnalysisSummary,
  } = useAnalysisStore();

  const { apiKey } = useAPIConfiguration();
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
        alert(
          "Please select an AI provider, model, and enter your API key in the AI Code Quality Insights section first."
        );
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
          if (!wasPreviouslyAnalyzed) {
            addAnalyzedPRIds([pr.id]);
          }
          toggleSelectedPR(pr.id);

          const currentAnalyzedIds =
            useAnalysisStore.getState().allAnalyzedPRIds;
          const allAnalyzedDataPromises = Array.from(currentAnalyzedIds).map(
            (id) => getAnalysisForPR(id)
          );
          const allAnalyzedResults = await Promise.all(allAnalyzedDataPromises);
          const successfulResults = allAnalyzedResults.filter(
            (res): res is PRAnalysisResult => res !== null && !res.error
          );

          if (successfulResults.length > 0) {
            const summary = aggregateFeedback(successfulResults);
            setAnalysisSummary(summary);
            console.log(
              `[handleAnalyzePR] Updated summary after analyzing PR #${pr.number}`
            );
          } else {
            console.warn(
              `[handleAnalyzePR] No successful results found to aggregate after analyzing PR #${pr.number}`
            );
            setAnalysisSummary(null);
          }
        } else {
          console.warn(`Analysis function returned null for PR #${pr.number}`);
        }
      } catch (error) {
        console.error(`Error in handleAnalyzePR for PR #${pr.number}:`, error);
        failAnalysis(pr.id);
        alert(`An error occurred while analyzing PR #${pr.number}.`);
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
      setAnalysisSummary,
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
        alert(
          "Please select an AI provider, model, and enter your API key in the AI Code Quality Insights section first."
        );
        return;
      }

      try {
        console.log(`Clearing cache for PR #${pr.id} before re-analysis.`);
        await cacheService.deletePRAnalysis(pr.id);

        const config: AIAnalysisConfig = {
          apiKey,
          provider: apiProvider,
          model: selectedModel,
        };

        const result = await analyzeAdditionalPR(pr, config);

        if (result) {
          addAnalyzedPRIds([pr.id]);
          toggleSelectedPR(pr.id);

          const currentAnalyzedIds =
            useAnalysisStore.getState().allAnalyzedPRIds;
          const allAnalyzedDataPromises = Array.from(currentAnalyzedIds).map(
            (id) => getAnalysisForPR(id)
          );
          const allAnalyzedResults = await Promise.all(allAnalyzedDataPromises);
          const successfulResults = allAnalyzedResults.filter(
            (res): res is PRAnalysisResult => res !== null && !res.error
          );

          if (successfulResults.length > 0) {
            const summary = aggregateFeedback(successfulResults);
            setAnalysisSummary(summary);
            console.log(
              `[handleReanalyzePR] Updated summary after re-analyzing PR #${pr.number}`
            );
          } else {
            console.warn(
              `[handleReanalyzePR] No successful results found to aggregate after re-analyzing PR #${pr.number}`
            );
            setAnalysisSummary(null);
          }
        } else {
          console.warn(
            `Re-analysis function returned null for PR #${pr.number}`
          );
          failAnalysis(pr.id);
        }
      } catch (error) {
        console.error(`Error re-analyzing PR #${pr.number}:`, error);
        failAnalysis(pr.id);
        alert(`An error occurred while re-analyzing PR #${pr.number}.`);
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
      setAnalysisSummary,
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
