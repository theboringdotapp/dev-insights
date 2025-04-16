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
    addAnalyzedPRIds,
    toggleSelectedPR,
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
        // Call the analysis function from usePRMetrics
        const result = await analyzeAdditionalPR(pr, config);

        if (result) {
          if (!wasPreviouslyAnalyzed) {
            addAnalyzedPRIds([pr.id]);
          }
          // Add to selection (toggle ensures it's added if not present)
          toggleSelectedPR(pr.id);
        } else {
          // Only show alert if it wasn't a silent failure/skip
          // analyzeAdditionalPR (and analyzePRCode) logs errors internally
          if (!result) {
            alert(`Analysis failed for PR #${pr.number}.`);
          }
        }
      } catch (error) {
        console.error(`Error analyzing PR #${pr.number}:`, error);
        // failAnalysis should be called within analyzePRCode/analyzeAdditionalPR
        alert(`An error occurred while analyzing PR #${pr.number}.`);
      }
    },
    [
      analyzingPRIds,
      hasApiKeys,
      allAnalyzedPRIds,
      analyzeAdditionalPR,
      addAnalyzedPRIds,
      toggleSelectedPR,
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

        const config: AIAnalysisConfig = {
          apiKey: currentApiKey,
          provider: currentApiProvider,
        };

        // Call the analysis function from usePRMetrics
        const result = await analyzeAdditionalPR(pr, config);

        if (result) {
          // Update store: Analysis completed (it was already analyzed, so newlyAnalyzed=false)
          addAnalyzedPRIds([pr.id]);
          // Add to selection (toggle ensures it's added if not present)
          toggleSelectedPR(pr.id);
        } else {
          // Only show alert if it wasn't a silent failure/skip
          if (!result) {
            alert(`Re-analysis failed for PR #${pr.number}.`);
          }
        }
      } catch (error) {
        console.error("Error re-analyzing PR:", error);
        // failAnalysis should be called within analyzePRCode/analyzeAdditionalPR
        alert(`An error occurred while re-analyzing PR #${pr.number}.`);
      }
    },
    [
      analyzingPRIds,
      hasApiKeys,
      allAnalyzedPRIds,
      analyzeAdditionalPR,
      addAnalyzedPRIds,
      toggleSelectedPR,
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
