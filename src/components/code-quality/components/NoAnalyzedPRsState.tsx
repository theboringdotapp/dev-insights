import React from "react";

interface NoAnalyzedPRsStateProps {
  handleAnalyze: () => void;
  hasApiKey: boolean;
  maxPRs: number;
  setMaxPRs: (maxPRs: number) => void;
  cachedCount: number;
}

/**
 * Component to display when no PRs have been analyzed but user has an API key
 */
export default function NoAnalyzedPRsState({
  handleAnalyze,
  hasApiKey,
  maxPRs,
  setMaxPRs,
  cachedCount,
}: NoAnalyzedPRsStateProps) {
  // Determine CTA text based on state
  const buttonText =
    cachedCount === maxPRs
      ? "Show Analysis"
      : cachedCount > 0
      ? `Analyze ${maxPRs - cachedCount} New PRs`
      : `Analyze last ${maxPRs} PRs`;

  return (
    <div className="py-8 px-4 text-center bg-gray-50 rounded-lg border border-gray-100">
      <div className="text-gray-400 mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-1">
        No Pull Requests Analyzed
      </h3>
      <p className="text-gray-500 mb-4">
        You haven't analyzed any pull requests yet. Choose how many PRs to
        analyze and click the button below.
      </p>

      <p className="mt-4 mb-4 text-sm text-gray-500 italic">
        You can also select individual PRs for analysis from the Timeline below.
        Once analyzed, they'll appear in the PR selection panel.
      </p>
      {/* PR Count Selector */}
      <div className="flex justify-center items-center mb-5">
        <select
          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
          value={maxPRs}
          onChange={(e) => setMaxPRs(Number(e.target.value))}
        >
          <option value="3">3 PRs</option>
          <option value="5">5 PRs</option>
          <option value="10">10 PRs</option>
          <option value="15">15 PRs</option>
        </select>
      </div>

      {hasApiKey ? (
        <div>
          <button
            onClick={handleAnalyze}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            {buttonText}
          </button>
        </div>
      ) : (
        <p className="text-amber-600 text-sm">
          Please configure your API key in settings to analyze pull requests.
        </p>
      )}
    </div>
  );
}
