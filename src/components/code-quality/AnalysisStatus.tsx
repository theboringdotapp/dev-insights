import React from "react";

interface AnalysisStatusProps {
  cachedCount: number;
  maxPRs: number;
  isAnalyzing: boolean;
  handleAnalyze: () => Promise<void>;
  apiKey: string;
}

export default function AnalysisStatus({
  cachedCount,
  maxPRs,
  isAnalyzing,
  handleAnalyze,
  apiKey,
}: AnalysisStatusProps) {
  return (
    <div className="my-6 text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
      <p className="text-gray-500">
        AI analysis will examine your PRs and provide insights on code quality,
        patterns, and career growth opportunities.
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
  );
}
