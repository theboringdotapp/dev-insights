import React from "react";
import { PullRequestItem } from "../../lib/types";

interface AnalysisButtonProps {
  pr: PullRequestItem;
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: (pr: PullRequestItem) => Promise<void>;
  onReanalyze: (pr: PullRequestItem) => Promise<void>;
}

export default function AnalysisButton({
  pr,
  isAnalyzed,
  isAnalyzing,
  onAnalyze,
  onReanalyze,
}: AnalysisButtonProps) {
  if (isAnalyzing) {
    return (
      <div className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded flex items-center">
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-purple-800"
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
        Analyzing...
      </div>
    );
  }

  if (isAnalyzed) {
    return (
      <div className="flex items-center">
        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded flex items-center">
          Analysed
        </span>
        <button
          onClick={() => onReanalyze(pr)}
          title="Re-analyze PR"
          className="ml-1 text-purple-500 hover:text-purple-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onAnalyze(pr)}
      className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
    >
      Analyze PR
    </button>
  );
}
