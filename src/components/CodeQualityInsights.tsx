import React, { useState, useEffect } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";

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
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<"openai" | "anthropic">(
    "openai"
  );
  const [maxPRs, setMaxPRs] = useState(5);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [saveToken, setSaveToken] = useState(true);
  const [useAllPRs, setUseAllPRs] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);

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

  // Keep track of which PRs were loaded from cache vs newly analyzed
  const [cachedPRIds, setCachedPRIds] = useState<number[]>([]);
  const [newlyAnalyzedPRIds, setNewlyAnalyzedPRIds] = useState<number[]>([]);

  // Load saved API key when provider changes or on initial load
  useEffect(() => {
    const storageKey =
      apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey("");
    }
  }, [apiProvider]);

  // Handle analyze button click
  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    // Save API key to local storage if opted in
    if (saveToken) {
      const storageKey =
        apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
      localStorage.setItem(storageKey, apiKey);
    }

    const config: AIAnalysisConfig = {
      apiKey,
      provider: apiProvider,
    };

    // Reset state for newly analyzed PRs
    setNewlyAnalyzedPRIds([]);

    // Get the current state of analyzed PRs before starting
    const prIdsToAnalyze = prsToAnalyze.slice(0, maxPRs).map((pr) => pr.id);

    // We already have the cached IDs from our useEffect

    // Call analyzeMultiplePRs in both cases - it will handle cache usage
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

  // Handle clearing the saved API key
  const handleResetApiKey = () => {
    const storageKey =
      apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
    localStorage.removeItem(storageKey);
    setApiKey("");
  };

  // Change provider without losing saved token
  const handleProviderChange = (newProvider: "openai" | "anthropic") => {
    // If saveToken is enabled, save the current key before switching
    if (saveToken && apiKey) {
      const currentStorageKey =
        apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
      localStorage.setItem(currentStorageKey, apiKey);
    }

    // Update the provider
    setApiProvider(newProvider);
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

      {/* Configuration panel */}
      {isConfigVisible && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Provider
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="apiProvider"
                  value="openai"
                  checked={apiProvider === "openai"}
                  onChange={() => handleProviderChange("openai")}
                />
                <span className="ml-2">OpenAI</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="apiProvider"
                  value="anthropic"
                  checked={apiProvider === "anthropic"}
                  onChange={() => handleProviderChange("anthropic")}
                />
                <span className="ml-2">Anthropic (Claude)</span>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="flex items-center">
              <input
                type="password"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${
                  apiProvider === "openai" ? "OpenAI" : "Anthropic"
                } API key`}
              />
              {apiKey && (
                <button
                  onClick={handleResetApiKey}
                  className="ml-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
                  title="Clear API key"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id="saveToken"
                checked={saveToken}
                onChange={() => setSaveToken(!saveToken)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="saveToken" className="ml-2 text-xs text-gray-500">
                Save API key in browser for future sessions
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of PRs to analyze
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={maxPRs}
              onChange={(e) => setMaxPRs(Number(e.target.value))}
            >
              <option value="3">3 PRs</option>
              <option value="5">5 PRs</option>
              <option value="10">10 PRs</option>
              <option value="15">15 PRs</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Analyzing more PRs provides better insights but may take longer
              and use more API credits.
            </p>
          </div>

          {/* PR selection option */}
          {allPRs && allPRs.length > pullRequests.length && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PRs to Analyze
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useAllPRs"
                  checked={useAllPRs}
                  onChange={handleToggleAllPRs}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="useAllPRs"
                  className="ml-2 text-sm text-gray-600"
                >
                  Include all PRs ({allPRs.length} total) instead of only{" "}
                  {pullRequests.length}{" "}
                  {showOnlyImportantPRs ? "important" : "filtered"} PRs
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                When enabled, analysis will include all PRs, not just the
                filtered ones. The dashboard will update to show all PRs.
              </p>
            </div>
          )}

          {/* Caching information */}
          {cachedCount > 0 && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {cachedCount === maxPRs ? (
                <span>
                  All selected PRs ({cachedCount}) already analyzed and cached
                </span>
              ) : (
                <span>
                  {cachedCount} of {maxPRs} PRs already analyzed and cached
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !apiKey}
              className={`px-4 py-2 rounded-md ${
                isAnalyzing || !apiKey
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Code Quality"}
            </button>
          </div>
        </div>
      )}

      {/* Analysis status and message */}
      {!analysisSummary && !isAnalyzing && (
        <div className="my-6 text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-500">
            AI analysis will examine your PRs and provide insights on code
            quality, patterns, and career growth opportunities.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !apiKey}
            className={`mt-4 px-4 py-2 rounded-md text-white ${
              isAnalyzing || !apiKey
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {cachedCount === maxPRs
              ? "Show Analysis (Using Cached Results)"
              : isAnalyzing
              ? "Analyzing..."
              : cachedCount > 0
              ? `Analyze (${maxPRs - cachedCount} New PRs)`
              : `Analyze ${maxPRs} PRs`}
          </button>
        </div>
      )}

      {/* Analysis loading indicator */}
      {isAnalyzing && (
        <div className="my-6 p-4 bg-blue-50 rounded-lg text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-blue-700 font-medium">
            Analyzing your pull requests with AI...
          </p>
          <p className="text-blue-600 text-sm mt-1">
            {cachedCount > 0 && (
              <span>
                Using {cachedCount} cached results to speed up analysis.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Analysis Results */}
      {!isAnalyzing && analysisSummary && (
        <div className="space-y-6">
          {/* Overall Summary */}
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-3 text-lg">
              Career Development Assessment
            </h4>
            <p className="text-gray-800">{analysisSummary.overallSummary}</p>
            <div className="mt-4 flex items-center">
              <div className="text-sm text-gray-600 mr-2 font-medium">
                Quality Score:
              </div>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    analysisSummary.averageScore >= 8
                      ? "bg-green-500"
                      : analysisSummary.averageScore >= 6
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${(analysisSummary.averageScore / 10) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="ml-2 font-medium">
                {analysisSummary.averageScore.toFixed(1)}/10
              </div>
            </div>
          </div>

          {/* Cache status legend */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
            <div className="font-medium mb-1">Cache Status Legend:</div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
                <span className="text-gray-600">Loaded from cache</span>
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1 text-blue-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-600">Newly analyzed</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">
                  {cachedPRIds.length} of{" "}
                  {cachedPRIds.length + newlyAnalyzedPRIds.length} PRs loaded
                  from cache
                </span>
              </div>
            </div>
          </div>

          {/* Common Strengths */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 text-lg">
              Code Strengths
            </h4>
            <div className="space-y-3">
              {analysisSummary.commonStrengths.map((strength, i) => (
                <div
                  key={i}
                  className="p-4 bg-green-50 border border-green-100 rounded-lg"
                >
                  <div className="flex items-start mb-2">
                    <div className="text-green-600 mr-3 flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 text-base">
                        {strength.text.charAt(0).toUpperCase() +
                          strength.text.slice(1)}
                      </h5>
                    </div>
                  </div>

                  <div className="ml-8">
                    <div className="text-xs text-gray-500 text-left">
                      Found in {strength.count} PR
                      {strength.count !== 1 ? "s" : ""}:
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {strength.prUrls.map((url, idx) => {
                          const prId = strength.prIds[idx];
                          const isCached = cachedPRIds.includes(prId);
                          const isNewlyAnalyzed =
                            newlyAnalyzedPRIds.includes(prId);

                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center px-2 py-1 bg-white rounded border ${
                                isCached
                                  ? "border-green-200 text-green-700"
                                  : "border-green-200 text-green-700"
                              } hover:bg-green-50`}
                              title={`${strength.prTitles[idx]}${
                                isCached ? " (loaded from cache)" : ""
                              }`}
                            >
                              #{url.split("/").pop()}
                              {isCached && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 ml-1 text-green-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                                </svg>
                              )}
                              {isNewlyAnalyzed && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 ml-1 text-blue-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {analysisSummary.commonStrengths.length === 0 && (
                <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">
                  No consistent strengths identified
                </div>
              )}
            </div>
          </div>

          {/* Common Weaknesses */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 text-lg">
              Areas for Improvement
            </h4>
            <div className="space-y-3">
              {analysisSummary.commonWeaknesses.map((weakness, i) => (
                <div
                  key={i}
                  className="p-4 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="flex items-start mb-2">
                    <div className="text-red-600 mr-3 flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 text-base">
                        {weakness.text.charAt(0).toUpperCase() +
                          weakness.text.slice(1)}
                      </h5>
                    </div>
                  </div>

                  <div className="ml-8">
                    <div className="text-xs text-gray-500 text-left">
                      Found in {weakness.count} PR
                      {weakness.count !== 1 ? "s" : ""}:
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {weakness.prUrls.map((url, idx) => {
                          const prId = weakness.prIds[idx];
                          const isCached = cachedPRIds.includes(prId);
                          const isNewlyAnalyzed =
                            newlyAnalyzedPRIds.includes(prId);

                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 bg-white rounded border border-red-200 text-red-700 hover:bg-red-50"
                              title={`${weakness.prTitles[idx]}${
                                isCached ? " (loaded from cache)" : ""
                              }`}
                            >
                              #{url.split("/").pop()}
                              {isCached && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 ml-1 text-green-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                                </svg>
                              )}
                              {isNewlyAnalyzed && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 ml-1 text-blue-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {analysisSummary.commonWeaknesses.length === 0 && (
                <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">
                  No consistent areas for improvement identified
                </div>
              )}
            </div>
          </div>

          {/* Suggested Improvements */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 text-lg">
              Growth Opportunities
            </h4>
            <div className="space-y-3">
              {analysisSummary.commonSuggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="p-4 bg-blue-50 border border-blue-100 rounded-lg"
                >
                  <div className="flex items-start mb-2">
                    <div className="text-blue-600 mr-3 flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 text-base">
                        {suggestion.text.charAt(0).toUpperCase() +
                          suggestion.text.slice(1)}
                      </h5>
                    </div>
                  </div>

                  <div className="ml-8">
                    <div className="text-xs text-gray-500 text-left">
                      Suggested in {suggestion.count} PR
                      {suggestion.count !== 1 ? "s" : ""}:
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {suggestion.prUrls.map((url, idx) => {
                          const prId = suggestion.prIds[idx];
                          const isCached = cachedPRIds.includes(prId);
                          const isNewlyAnalyzed =
                            newlyAnalyzedPRIds.includes(prId);

                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 bg-white rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                              title={`${suggestion.prTitles[idx]}${
                                isCached ? " (loaded from cache)" : ""
                              }`}
                            >
                              #{url.split("/").pop()}
                              {isCached && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 ml-1 text-green-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                                </svg>
                              )}
                              {isNewlyAnalyzed && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 ml-1 text-blue-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {analysisSummary.commonSuggestions.length === 0 && (
                <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">
                  No consistent growth opportunities identified
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initial State / No Analysis Yet */}
      {!isAnalyzing && !analysisSummary && !isConfigVisible && (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Analyze Code Quality
          </h3>
          <p className="text-gray-500 mb-4">
            Use AI to analyze this developer's code across multiple PRs to
            identify patterns, strengths, and areas for improvement.
          </p>
          <button
            onClick={() => setIsConfigVisible(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}
