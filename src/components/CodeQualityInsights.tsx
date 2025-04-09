import React, { useState, useEffect } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";
import ConfigurationPanel from "./code-quality/ConfigurationPanel";
import AnalysisStatus from "./code-quality/AnalysisStatus";
import AnalysisResults from "./code-quality/AnalysisResults";
import InitialState from "./code-quality/InitialState";
import AnalysisLoadingIndicator from "./code-quality/AnalysisLoadingIndicator";
import { useAPIConfiguration } from "../hooks/useAPIConfiguration";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  showOnlyImportantPRs?: boolean;
  onToggleFilter?: (showOnlyImportant: boolean) => void;
}

export function CodeQualityInsights({
  pullRequests,
  allPRs,
  showOnlyImportantPRs = true,
  onToggleFilter,
}: CodeQualityInsightsProps) {
  const {
    analyzeMultiplePRs,
    isAnalyzing,
    analysisSummary,
    getAnalysisForPR,
    getAnalysisFromMemoryCache,
  } = usePRMetrics();
  const {
    apiKey,
    setApiKey,
    apiProvider,
    saveToken,
    setSaveToken,
    handleProviderChange,
    handleResetApiKey,
    saveApiKey,
  } = useAPIConfiguration();

  const [maxPRs, setMaxPRs] = useState(5);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);
  const [viewAllAnalyzedPRs, setViewAllAnalyzedPRs] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [cachedPRIds, setCachedPRIds] = useState<number[]>([]);
  const [allAnalyzedPRIds, setAllAnalyzedPRIds] = useState<number[]>([]);
  const [newlyAnalyzedPRIds, setNewlyAnalyzedPRIds] = useState<number[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check if API key exists on mount
  useEffect(() => {
    const openaiKey = localStorage.getItem(OPENAI_KEY_STORAGE);
    const anthropicKey = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
    const hasKey = !!(openaiKey || anthropicKey);
    setHasApiKey(hasKey);
    // Only show config if no keys are found
    setIsConfigVisible(!hasKey);
  }, []);

  // Determine which PRs to analyze
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // Check how many PRs already have analysis (both top N and all PRs)
  useEffect(() => {
    if (prsToAnalyze.length === 0) return;

    const checkCachedCount = async () => {
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

      setCachedCount(count);
      setCachedPRIds(cachedIds);
      setAllAnalyzedPRIds(allIds);
    };

    checkCachedCount();
  }, [prsToAnalyze, maxPRs, getAnalysisForPR, refreshTrigger]);

  // Refresh analyses when view mode changes
  useEffect(() => {
    if (analysisSummary) {
      // Force refresh analysis to update displayed PRs
      handleRefreshAnalysis();
    }
  }, [viewAllAnalyzedPRs]);

  // Function to refresh analysis based on current view mode
  const handleRefreshAnalysis = async () => {
    if (!hasApiKey && !apiKey) return;

    const config: AIAnalysisConfig = {
      apiKey:
        apiKey ||
        localStorage.getItem(OPENAI_KEY_STORAGE) ||
        localStorage.getItem(ANTHROPIC_KEY_STORAGE) ||
        "",
      provider: apiProvider,
    };

    // We don't need to re-analyze, just fetch all cached analyses
    const targetPRIds = viewAllAnalyzedPRs
      ? allAnalyzedPRIds
      : cachedPRIds.concat(newlyAnalyzedPRIds);

    // Filter to only get PRs that exist in our current list
    const targetPRs = prsToAnalyze.filter((pr) => targetPRIds.includes(pr.id));

    // Set a small timeout to allow state updates to propagate
    setTimeout(() => {
      // Trigger the analysis operation with 0 max PRs to just refresh the UI without new API calls
      analyzeMultiplePRs(targetPRs, config, 0);
    }, 100);

    // Also trigger a refresh check for any new analyses
    setRefreshTrigger((prev) => prev + 1);
  };

  // Subscribe to Timeline PR analysis changes
  useEffect(() => {
    // Set up an interval to check for newly analyzed PRs from Timeline
    const intervalId = setInterval(async () => {
      // Check if any PRs in our list have been newly analyzed
      let hasNewAnalysis = false;

      for (const pr of prsToAnalyze) {
        // Skip if already known to be analyzed
        if (allAnalyzedPRIds.includes(pr.id)) continue;

        // Check memory cache first (faster)
        let isAnalyzed = !!getAnalysisFromMemoryCache(pr.id);

        // If not in memory, check persistent cache
        if (!isAnalyzed) {
          isAnalyzed = !!(await getAnalysisForPR(pr.id));
        }

        if (isAnalyzed) {
          hasNewAnalysis = true;
          break;
        }
      }

      // If new analyses found, trigger a refresh
      if (hasNewAnalysis) {
        setRefreshTrigger((prev) => prev + 1);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(intervalId);
  }, [
    prsToAnalyze,
    allAnalyzedPRIds,
    getAnalysisFromMemoryCache,
    getAnalysisForPR,
  ]);

  // Listen for PR analysis events from Timeline
  useEffect(() => {
    const handleAnalysisStarted = () => {
      // Reset the refresh check timer
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleAnalysisCompleted = (e: Event) => {
      const event = e as CustomEvent;
      const prId = event.detail?.prId;

      if (prId) {
        // Update allAnalyzedPRIds to include this PR
        setAllAnalyzedPRIds((prev) => {
          if (prev.includes(prId)) return prev;
          return [...prev, prId];
        });

        // Force refresh of analysis results if we have a summary
        if (analysisSummary && viewAllAnalyzedPRs) {
          setTimeout(() => {
            handleRefreshAnalysis();
          }, 500); // Small delay to ensure cache is updated
        }
      }
    };

    // Add event listeners
    window.addEventListener("pr-analysis-started", handleAnalysisStarted);
    window.addEventListener("pr-analysis-completed", handleAnalysisCompleted);

    return () => {
      // Clean up event listeners
      window.removeEventListener("pr-analysis-started", handleAnalysisStarted);
      window.removeEventListener(
        "pr-analysis-completed",
        handleAnalysisCompleted
      );
    };
  }, [analysisSummary, viewAllAnalyzedPRs]);

  // Handle analyze button click
  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    // Save API key if opted in
    saveApiKey();
    setHasApiKey(true);

    const config: AIAnalysisConfig = {
      apiKey,
      provider: apiProvider,
    };

    // Reset state for newly analyzed PRs
    setNewlyAnalyzedPRIds([]);

    // Call analyzeMultiplePRs - it will handle cache usage
    const results = await analyzeMultiplePRs(prsToAnalyze, config, maxPRs);

    // Update all analyzed PRs
    const resultIds = results.map((r) => r.prId);
    setAllAnalyzedPRIds((prev) => {
      const uniqueIds = new Set([...prev, ...resultIds]);
      return Array.from(uniqueIds);
    });

    // Determine which PRs were newly analyzed - only if they weren't in the initial cached list
    const newlyAnalyzed = results
      .map((r) => r.prId)
      .filter((id) => !cachedPRIds.includes(id));

    setNewlyAnalyzedPRIds(newlyAnalyzed);

    // Update filter if analyzing all PRs and not already showing all
    if (useAllPRs && showOnlyImportantPRs && onToggleFilter) {
      onToggleFilter(false);
    }
  };

  // Toggle between filtered PRs and all PRs
  const handleToggleAllPRs = () => {
    setUseAllPRs(!useAllPRs);
  };

  // Toggle between viewing only top N analyzed PRs and all analyzed PRs
  const handleToggleViewAllAnalyzed = () => {
    setViewAllAnalyzedPRs(!viewAllAnalyzedPRs);
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Code Quality Insights</h3>
        {hasApiKey && (
          <button
            onClick={() => setIsConfigVisible(!isConfigVisible)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isConfigVisible ? "Hide Settings" : "Show Settings"}
          </button>
        )}
      </div>

      {/* Controls for PR count and view mode */}
      {(hasApiKey || apiKey) && !isAnalyzing && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* PR Count Selector */}
          <div className="flex items-center">
            <label className="mr-2 text-sm font-medium">Analyze:</label>
            <select
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              value={maxPRs}
              onChange={(e) => setMaxPRs(Number(e.target.value))}
              disabled={isAnalyzing}
            >
              <option value="3">3 PRs</option>
              <option value="5">5 PRs</option>
              <option value="10">10 PRs</option>
              <option value="15">15 PRs</option>
            </select>
          </div>

          {/* View All Analyzed Toggle - only show if there are analyzed PRs */}
          {allAnalyzedPRIds.length > 0 && (
            <div className="flex items-center ml-4">
              <input
                type="checkbox"
                id="viewAllAnalyzed"
                checked={viewAllAnalyzedPRs}
                onChange={handleToggleViewAllAnalyzed}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="viewAllAnalyzed" className="ml-2 text-sm">
                View all analyzed PRs ({allAnalyzedPRIds.length})
              </label>
            </div>
          )}

          {/* Button to perform analysis */}
          {!analysisSummary && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !apiKey}
              className={`ml-auto px-3 py-1 rounded-md text-white text-sm ${
                isAnalyzing || !apiKey
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {cachedCount === maxPRs
                ? "Show Analysis"
                : cachedCount > 0
                ? `Analyze ${maxPRs - cachedCount} New PRs`
                : `Analyze ${maxPRs} PRs`}
            </button>
          )}
        </div>
      )}

      {isConfigVisible && (
        <ConfigurationPanel
          apiKey={apiKey}
          apiProvider={apiProvider}
          maxPRs={maxPRs}
          saveToken={saveToken}
          setSaveToken={setSaveToken}
          handleProviderChange={handleProviderChange}
          useAllPRs={useAllPRs}
          handleToggleAllPRs={handleToggleAllPRs}
          allPRs={allPRs}
          pullRequests={pullRequests}
          showOnlyImportantPRs={showOnlyImportantPRs}
          cachedCount={cachedCount}
          isAnalyzing={isAnalyzing}
          handleAnalyze={handleAnalyze}
          setApiKey={setApiKey}
          handleResetApiKey={handleResetApiKey}
        />
      )}

      {!hasApiKey && !apiKey && !analysisSummary && !isAnalyzing && (
        <AnalysisStatus cachedCount={cachedCount} />
      )}

      {isAnalyzing && <AnalysisLoadingIndicator cachedCount={cachedCount} />}

      {!isAnalyzing && analysisSummary && (
        <AnalysisResults
          analysisSummary={analysisSummary}
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          viewAllAnalyzedPRs={viewAllAnalyzedPRs}
          allAnalyzedPRIds={allAnalyzedPRIds}
        />
      )}

      {!hasApiKey &&
        !apiKey &&
        !isAnalyzing &&
        !analysisSummary &&
        !isConfigVisible && (
          <InitialState setIsConfigVisible={setIsConfigVisible} />
        )}
    </div>
  );
}
