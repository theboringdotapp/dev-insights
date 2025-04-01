import React, { useState } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
}

export function CodeQualityInsights({
  pullRequests,
}: CodeQualityInsightsProps) {
  const { analyzeMultiplePRs, isAnalyzing, analysisSummary } = usePRMetrics();
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<"openai" | "anthropic">(
    "openai"
  );
  const [maxPRs, setMaxPRs] = useState(5);
  const [isConfigVisible, setIsConfigVisible] = useState(false);

  // Handle analyze button click
  const handleAnalyze = () => {
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    const config: AIAnalysisConfig = {
      apiKey,
      provider: apiProvider,
    };

    analyzeMultiplePRs(pullRequests, config, maxPRs);
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
                  onChange={() => setApiProvider("openai")}
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
                  onChange={() => setApiProvider("anthropic")}
                />
                <span className="ml-2">Anthropic (Claude)</span>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${
                apiProvider === "openai" ? "OpenAI" : "Anthropic"
              } API key`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Your API key is used only for processing requests and is not
              stored.
            </p>
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

      {/* Analysis Loading Indicator */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">
            Analyzing PRs for code quality patterns...
          </p>
          <p className="text-sm text-gray-500">
            This may take a minute or two as we run each PR through AI analysis.
          </p>
        </div>
      )}

      {/* Analysis Results */}
      {!isAnalyzing && analysisSummary && (
        <div className="space-y-6">
          {/* Overall Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-2">
              Career Development Assessment
            </h4>
            <p className="text-gray-800">{analysisSummary.overallSummary}</p>
            <div className="mt-3 flex items-center">
              <div className="text-sm text-gray-500 mr-2">Quality Score:</div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
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

          {/* Common Strengths */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">Code Strengths</h4>
            <ul className="space-y-2">
              {analysisSummary.commonStrengths.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start p-2 bg-green-50 border border-green-100 rounded-md"
                >
                  <div className="text-green-600 mr-2">
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
                  <div className="flex-1">
                    <p className="text-gray-800">{strength.text}</p>
                    <span className="text-xs text-gray-500">
                      Found in {strength.count} PR
                      {strength.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </li>
              ))}
              {analysisSummary.commonStrengths.length === 0 && (
                <li className="text-gray-500 italic">
                  No consistent strengths identified
                </li>
              )}
            </ul>
          </div>

          {/* Common Weaknesses */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">
              Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {analysisSummary.commonWeaknesses.map((weakness, i) => (
                <li
                  key={i}
                  className="flex items-start p-2 bg-red-50 border border-red-100 rounded-md"
                >
                  <div className="text-red-600 mr-2">
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
                  <div className="flex-1">
                    <p className="text-gray-800">{weakness.text}</p>
                    <span className="text-xs text-gray-500">
                      Found in {weakness.count} PR
                      {weakness.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </li>
              ))}
              {analysisSummary.commonWeaknesses.length === 0 && (
                <li className="text-gray-500 italic">
                  No consistent areas for improvement identified
                </li>
              )}
            </ul>
          </div>

          {/* Suggested Improvements */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">
              Growth Opportunities
            </h4>
            <ul className="space-y-2">
              {analysisSummary.commonSuggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="flex items-start p-2 bg-blue-50 border border-blue-100 rounded-md"
                >
                  <div className="text-blue-600 mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800">{suggestion.text}</p>
                    <span className="text-xs text-gray-500">
                      Suggested in {suggestion.count} PR
                      {suggestion.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </li>
              ))}
              {analysisSummary.commonSuggestions.length === 0 && (
                <li className="text-gray-500 italic">
                  No consistent growth opportunities identified
                </li>
              )}
            </ul>
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
