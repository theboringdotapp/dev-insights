import React from "react";
import { PullRequestItem } from "../../lib/types";

interface ConfigurationPanelProps {
  apiKey: string;
  apiProvider: "openai" | "anthropic";
  maxPRs: number;
  setMaxPRs: (value: number) => void;
  saveToken: boolean;
  setSaveToken: (value: boolean) => void;
  handleProviderChange: (provider: "openai" | "anthropic") => void;
  useAllPRs: boolean;
  handleToggleAllPRs: () => void;
  allPRs?: PullRequestItem[];
  pullRequests: PullRequestItem[];
  showOnlyImportantPRs: boolean;
  cachedCount: number;
  isAnalyzing: boolean;
  handleAnalyze: () => Promise<void>;
  setApiKey: (key: string) => void;
  handleResetApiKey: () => void;
}

export default function ConfigurationPanel({
  apiKey,
  apiProvider,
  maxPRs,
  setMaxPRs,
  saveToken,
  setSaveToken,
  handleProviderChange,
  useAllPRs,
  handleToggleAllPRs,
  allPRs,
  pullRequests,
  showOnlyImportantPRs,
  cachedCount,
  isAnalyzing,
  handleAnalyze,
  setApiKey,
  handleResetApiKey,
}: ConfigurationPanelProps) {
  return (
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
          Analyzing more PRs provides better insights but may take longer and
          use more API credits.
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
            <label htmlFor="useAllPRs" className="ml-2 text-sm text-gray-600">
              Include all PRs ({allPRs.length} total) instead of only{" "}
              {pullRequests.length}{" "}
              {showOnlyImportantPRs ? "important" : "filtered"} PRs
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            When enabled, analysis will include all PRs, not just the filtered
            ones. The dashboard will update to show all PRs.
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
  );
}
