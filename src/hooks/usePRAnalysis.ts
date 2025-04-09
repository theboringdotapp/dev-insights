import { useState, useEffect, useCallback } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";
import cacheService from "../lib/cacheService";

export function usePRAnalysis(pullRequests: PullRequestItem[]) {
  const {
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
    analyzeAdditionalPR,
    isAnalyzing: isAnalyzingGlobal,
  } = usePRMetrics();

  // State for tracking which PR is being analyzed
  const [analyzingPrId, setAnalyzingPrId] = useState<number | null>(null);
  // State to track analyzed PR IDs
  const [analyzedPRIds, setAnalyzedPRIds] = useState<Record<number, boolean>>(
    {}
  );
  // State to track if API keys are available
  const [hasApiKeys, setHasApiKeys] = useState<boolean>(false);

  // Check for saved API keys on component mount
  useEffect(() => {
    const openaiKey = localStorage.getItem("github-review-openai-key");
    const anthropicKey = localStorage.getItem("github-review-anthropic-key");
    setHasApiKeys(!!(openaiKey || anthropicKey));
  }, []);

  // Check for cached PR analyses when component mounts or PRs change
  useEffect(() => {
    const checkCachedPRs = async () => {
      const newAnalyzedPRIds: Record<number, boolean> = {};

      for (const pr of pullRequests) {
        const isAnalyzed = await getAnalysisForPR(pr.id);
        if (isAnalyzed) {
          newAnalyzedPRIds[pr.id] = true;
        }
      }

      setAnalyzedPRIds(newAnalyzedPRIds);
    };

    checkCachedPRs();
  }, [pullRequests, getAnalysisForPR]);

  // Function to handle analyzing a single PR
  const handleAnalyzePR = useCallback(
    async (pr: PullRequestItem) => {
      if (analyzingPrId) return; // Don't allow multiple PR analysis at once

      // Check for API keys
      const openaiKey = localStorage.getItem("github-review-openai-key");
      const anthropicKey = localStorage.getItem("github-review-anthropic-key");

      if (!openaiKey && !anthropicKey) {
        alert(
          "Please set up your API key in the AI Code Quality Insights section first"
        );
        return;
      }

      // Determine which provider to use based on available keys
      const provider = openaiKey ? "openai" : "anthropic";
      const apiKey = openaiKey || anthropicKey || "";

      const config: AIAnalysisConfig = {
        apiKey,
        provider,
      };

      setAnalyzingPrId(pr.id);

      try {
        // Trigger a custom event that CodeQualityInsights can listen for
        const analyzeStartEvent = new CustomEvent("pr-analysis-started", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeStartEvent);

        await analyzeAdditionalPR(pr, config);
        setAnalyzedPRIds((prev) => ({ ...prev, [pr.id]: true }));

        // Notify that analysis completed
        const analyzeCompleteEvent = new CustomEvent("pr-analysis-completed", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeCompleteEvent);
      } catch (error) {
        console.error("Error analyzing PR:", error);
      } finally {
        setAnalyzingPrId(null);
      }
    },
    [analyzingPrId, analyzeAdditionalPR]
  );

  // Function to handle re-analyzing a PR
  const handleReanalyzePR = useCallback(
    async (pr: PullRequestItem) => {
      if (analyzingPrId) return; // Don't allow multiple PR analysis at once

      // Check for API keys
      const openaiKey = localStorage.getItem("github-review-openai-key");
      const anthropicKey = localStorage.getItem("github-review-anthropic-key");

      if (!openaiKey && !anthropicKey) {
        alert(
          "Please set up your API key in the AI Code Quality Insights section first"
        );
        return;
      }

      setAnalyzingPrId(pr.id);

      try {
        // Delete the cache for this PR
        await cacheService.deletePRAnalysis(pr.id);

        // Re-analyze the PR
        const provider = openaiKey ? "openai" : "anthropic";
        const apiKey = openaiKey || anthropicKey || "";

        const config: AIAnalysisConfig = {
          apiKey,
          provider,
        };

        await analyzeAdditionalPR(pr, config);
        setAnalyzedPRIds((prev) => ({ ...prev, [pr.id]: true }));
      } catch (error) {
        console.error("Error re-analyzing PR:", error);
      } finally {
        setAnalyzingPrId(null);
      }
    },
    [analyzingPrId, analyzeAdditionalPR]
  );

  // Check if a PR has been analyzed
  const isPRAnalyzed = useCallback(
    (prId: number): boolean => {
      return !!analyzedPRIds[prId] || !!getAnalysisFromMemoryCache(prId);
    },
    [analyzedPRIds, getAnalysisFromMemoryCache]
  );

  return {
    hasApiKeys,
    analyzingPrId,
    isPRAnalyzed,
    handleAnalyzePR,
    handleReanalyzePR,
    isAnalyzing: isAnalyzingGlobal,
  };
}
