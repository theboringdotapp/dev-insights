import { useEffect, useCallback, useState } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { useAnalysisStore } from "../stores/analysisStore";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";
import cacheService from "../lib/cacheService";

export function usePRAnalysis(pullRequests: PullRequestItem[]) {
  const { analyzeAdditionalPR, getAnalysisForPR, getAnalysisFromMemoryCache } =
    usePRMetrics();

  const {
    analyzingPRIds,
    allAnalyzedPRIds,
    startAnalysis,
    completeAnalysis,
    failAnalysis,
    addAnalyzedPRIds,
    setSelectedPRIds,
  } = useAnalysisStore();

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

  // Check for API keys directly from localStorage (as before, for simplicity)
  // TODO: Centralize API key state management later
  const [hasApiKeys, setHasApiKeys] = useState(false);
  useEffect(() => {
    const openaiKey = localStorage.getItem("github-review-openai-key");
    const anthropicKey = localStorage.getItem("github-review-anthropic-key");
    setHasApiKeys(!!(openaiKey || anthropicKey));
  }, []);

  // Function to handle analyzing a single PR
  const handleAnalyzePR = useCallback(
    async (pr: PullRequestItem) => {
      if (analyzingPRIds.has(pr.id)) {
        console.log(`PR #${pr.id} is already being analyzed.`);
        return;
      }

      // Get necessary API keys from local storage
      // This duplicates the check in the effect, but is needed here
      const openaiKey = localStorage.getItem("github-review-openai-key");
      const anthropicKey = localStorage.getItem("github-review-anthropic-key");
      const currentApiKey = openaiKey || anthropicKey;
      const currentApiProvider = openaiKey ? "openai" : "anthropic";

      if (!currentApiKey) {
        alert(
          "Please set up your API key in the AI Code Quality Insights section first."
        );
        return;
      }

      const config: AIAnalysisConfig = {
        apiKey: currentApiKey,
        provider: currentApiProvider,
      };

      const wasPreviouslyAnalyzed = allAnalyzedPRIds.has(pr.id);

      try {
        startAnalysis(pr.id);

        const result = await analyzeAdditionalPR(pr, config);

        if (result) {
          completeAnalysis(pr.id, !wasPreviouslyAnalyzed);
          if (!wasPreviouslyAnalyzed) {
            addAnalyzedPRIds([pr.id]);
          }
          setSelectedPRIds([pr.id]);
        } else {
          failAnalysis(pr.id);
          alert(`Analysis failed for PR #${pr.number}.`);
        }
      } catch (error) {
        console.error(`Error analyzing PR #${pr.number}:`, error);
        failAnalysis(pr.id);
        alert(`An error occurred while analyzing PR #${pr.number}.`);
      }
    },
    [
      analyzingPRIds,
      hasApiKeys,
      allAnalyzedPRIds,
      startAnalysis,
      analyzeAdditionalPR,
      completeAnalysis,
      addAnalyzedPRIds,
      failAnalysis,
      setSelectedPRIds,
    ]
  );

  // Function to handle re-analyzing a PR
  const handleReanalyzePR = useCallback(
    async (pr: PullRequestItem) => {
      if (analyzingPRIds.has(pr.id)) {
        console.log(`PR #${pr.id} is already being analyzed.`);
        return;
      }

      // Get necessary API keys from local storage
      // This duplicates the check in the effect, but is needed here
      const openaiKey = localStorage.getItem("github-review-openai-key");
      const anthropicKey = localStorage.getItem("github-review-anthropic-key");
      const currentApiKey = openaiKey || anthropicKey;
      const currentApiProvider = openaiKey ? "openai" : "anthropic";

      if (!currentApiKey) {
        alert(
          "Please set up your API key in the AI Code Quality Insights section first."
        );
        return;
      }

      try {
        await cacheService.deletePRAnalysis(pr.id);

        startAnalysis(pr.id);

        const config: AIAnalysisConfig = {
          apiKey: currentApiKey,
          provider: currentApiProvider,
        };

        const result = await analyzeAdditionalPR(pr, config);

        if (result) {
          completeAnalysis(pr.id, false);
          addAnalyzedPRIds([pr.id]);
          setSelectedPRIds([pr.id]);
        } else {
          failAnalysis(pr.id);
          alert(`Re-analysis failed for PR #${pr.number}.`);
        }
      } catch (error) {
        console.error("Error re-analyzing PR:", error);
        failAnalysis(pr.id);
        alert(`An error occurred while re-analyzing PR #${pr.number}.`);
      }
    },
    [
      analyzingPRIds,
      hasApiKeys,
      allAnalyzedPRIds,
      startAnalysis,
      analyzeAdditionalPR,
      completeAnalysis,
      addAnalyzedPRIds,
      failAnalysis,
      setSelectedPRIds,
    ]
  );

  // Check if a PR has been analyzed
  const isPRAnalyzed = useCallback(
    (prId: number): boolean => {
      // Check store first, then check memory cache as fallback
      // Note: getAnalysisForPR was async, use sync getAnalysisFromMemoryCache
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
    hasApiKeys,
    analyzingPRIds,
    isAnalyzingPR,
    isPRAnalyzed,
    handleAnalyzePR,
    handleReanalyzePR,
  };
}
