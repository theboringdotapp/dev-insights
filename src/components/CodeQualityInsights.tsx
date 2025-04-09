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
  const { analyzeMultiplePRs, isAnalyzing, analysisSummary, getAnalysisForPR } =
    usePRMetrics();
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
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [useAllPRs, setUseAllPRs] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [cachedPRIds, setCachedPRIds] = useState<number[]>([]);
  const [newlyAnalyzedPRIds, setNewlyAnalyzedPRIds] = useState<number[]>([]);

  // Determine which PRs to analyze
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // Check how many PRs already have analysis
  useEffect(() => {
    if (prsToAnalyze.length === 0) return;

    const checkCachedCount = async () => {
      let count = 0;
      const cachedIds: number[] = [];

      for (const pr of prsToAnalyze.slice(0, maxPRs)) {
        const isAnalyzed = await getAnalysisForPR(pr.id);
        if (isAnalyzed) {
          count++;
          cachedIds.push(pr.id);
        }
      }

      setCachedCount(count);
      setCachedPRIds(cachedIds);
    };

    checkCachedCount();
  }, [prsToAnalyze, maxPRs, getAnalysisForPR]);

  // Handle analyze button click
  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    // Save API key if opted in
    saveApiKey();

    const config: AIAnalysisConfig = {
      apiKey,
      provider: apiProvider,
    };

    // Reset state for newly analyzed PRs
    setNewlyAnalyzedPRIds([]);

    // Call analyzeMultiplePRs - it will handle cache usage
    const results = await analyzeMultiplePRs(prsToAnalyze, config, maxPRs);

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

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Code Quality Insights</h3>
        <button
          onClick={() => setIsConfigVisible(!isConfigVisible)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isConfigVisible ? "Hide Settings" : "Show Settings"}
        </button>
      </div>

      {isConfigVisible && (
        <ConfigurationPanel
          apiKey={apiKey}
          apiProvider={apiProvider}
          maxPRs={maxPRs}
          setMaxPRs={setMaxPRs}
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

      {!analysisSummary && !isAnalyzing && (
        <AnalysisStatus
          cachedCount={cachedCount}
          maxPRs={maxPRs}
          isAnalyzing={isAnalyzing}
          handleAnalyze={handleAnalyze}
          apiKey={apiKey}
        />
      )}

      {isAnalyzing && <AnalysisLoadingIndicator cachedCount={cachedCount} />}

      {!isAnalyzing && analysisSummary && (
        <AnalysisResults
          analysisSummary={analysisSummary}
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
        />
      )}

      {!isAnalyzing && !analysisSummary && !isConfigVisible && (
        <InitialState setIsConfigVisible={setIsConfigVisible} />
      )}
    </div>
  );
}
