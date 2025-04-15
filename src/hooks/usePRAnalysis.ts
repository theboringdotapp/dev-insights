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
  // Tracking PR IDs that are being analyzed by other components
  const [externallyAnalyzingPRIds, setExternallyAnalyzingPRIds] = useState<
    number[]
  >([]);

  // Check for saved API keys on component mount
  useEffect(() => {
    const openaiKey = localStorage.getItem("github-review-openai-key");
    const anthropicKey = localStorage.getItem("github-review-anthropic-key");
    setHasApiKeys(!!(openaiKey || anthropicKey));
  }, []);

  // Check for cached PR analyses when component mounts or PRs change
  useEffect(() => {
    const checkCachedPRs = async () => {
      const newAnalyzedPRIds: Record<number, boolean> = { ...analyzedPRIds };
      let updatedIds = false;

      for (const pr of pullRequests) {
        // First check memory cache for faster response
        const inMemoryAnalysis = getAnalysisFromMemoryCache(pr.id);
        if (inMemoryAnalysis && !newAnalyzedPRIds[pr.id]) {
          newAnalyzedPRIds[pr.id] = true;
          updatedIds = true;
          continue;
        }

        // Then check persistent cache
        if (!newAnalyzedPRIds[pr.id]) {
          const isAnalyzed = await getAnalysisForPR(pr.id);
          if (isAnalyzed) {
            newAnalyzedPRIds[pr.id] = true;
            updatedIds = true;
          }
        }
      }

      if (updatedIds) {
        setAnalyzedPRIds(newAnalyzedPRIds);
      }
    };

    checkCachedPRs();

    // Set up a polling interval to periodically check for new analyses
    const intervalId = setInterval(checkCachedPRs, 5000);

    return () => clearInterval(intervalId);
  }, [
    pullRequests,
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
    analyzedPRIds,
  ]);

  // Listen for PR analysis events from other components
  useEffect(() => {
    const handleAnalysisStarted = (e: Event) => {
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      if (prId) {
        setExternallyAnalyzingPRIds((prev) => {
          if (prev.includes(prId)) return prev;
          return [...prev, prId];
        });
      }
    };

    const handleAnalysisCompleted = (e: Event) => {
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      if (prId) {
        // Remove from analyzing list
        setExternallyAnalyzingPRIds((prev) => prev.filter((id) => id !== prId));

        // Mark as analyzed immediately
        setAnalyzedPRIds((prev) => ({ ...prev, [prId]: true }));

        // Force a check for new analyses
        const matchingPR = pullRequests.find((pr) => pr.id === prId);
        if (matchingPR) {
          // Check memory cache first
          const inMemoryAnalysis = getAnalysisFromMemoryCache(prId);
          if (!inMemoryAnalysis) {
            // If not in memory, check persistent cache
            getAnalysisForPR(prId).then((result) => {
              if (result) {
                setAnalyzedPRIds((prev) => ({ ...prev, [prId]: true }));
              }
            });
          }
        }
      }
    };

    const handleAnalysisFailed = (e: Event) => {
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      if (prId) {
        setExternallyAnalyzingPRIds((prev) => prev.filter((id) => id !== prId));
      }
    };

    // Add event listeners
    window.addEventListener("pr-analysis-started", handleAnalysisStarted);
    window.addEventListener("pr-analysis-completed", handleAnalysisCompleted);
    window.addEventListener("pr-analysis-failed", handleAnalysisFailed);

    return () => {
      // Clean up event listeners
      window.removeEventListener("pr-analysis-started", handleAnalysisStarted);
      window.removeEventListener(
        "pr-analysis-completed",
        handleAnalysisCompleted
      );
      window.removeEventListener("pr-analysis-failed", handleAnalysisFailed);
    };
  }, [pullRequests, getAnalysisForPR, getAnalysisFromMemoryCache]);

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

        // Notify that analysis failed
        const analyzeFailedEvent = new CustomEvent("pr-analysis-failed", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeFailedEvent);
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

        // Trigger a custom event that CodeQualityInsights can listen for
        const analyzeStartEvent = new CustomEvent("pr-analysis-started", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeStartEvent);

        // Re-analyze the PR
        const provider = openaiKey ? "openai" : "anthropic";
        const apiKey = openaiKey || anthropicKey || "";

        const config: AIAnalysisConfig = {
          apiKey,
          provider,
        };

        await analyzeAdditionalPR(pr, config);
        setAnalyzedPRIds((prev) => ({ ...prev, [pr.id]: true }));

        // Notify that analysis completed
        const analyzeCompleteEvent = new CustomEvent("pr-analysis-completed", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeCompleteEvent);
      } catch (error) {
        console.error("Error re-analyzing PR:", error);

        // Notify that analysis failed
        const analyzeFailedEvent = new CustomEvent("pr-analysis-failed", {
          detail: { prId: pr.id },
        });
        window.dispatchEvent(analyzeFailedEvent);
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

  // Determine if a PR is currently being analyzed (either locally or by another component)
  const isAnalyzingPR = useCallback(
    (prId: number): boolean => {
      return prId === analyzingPrId || externallyAnalyzingPRIds.includes(prId);
    },
    [analyzingPrId, externallyAnalyzingPRIds]
  );

  return {
    hasApiKeys,
    analyzingPrId: null, // Deprecated, use isAnalyzingPR instead
    isPRAnalyzed,
    handleAnalyzePR,
    handleReanalyzePR,
    isAnalyzing: isAnalyzingGlobal,
    isAnalyzingPR, // New function to check if a PR is being analyzed
  };
}
