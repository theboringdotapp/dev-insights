import React from "react";
import OverallSummary from "./analysis/OverallSummary";
import PRFeatureList from "./analysis/PRFeatureList";
import { FeedbackFrequency } from "../../lib/types";

interface AnalysisSummary {
  overallSummary: string;
  averageScore: number;
  commonStrengths: FeedbackFrequency[];
  commonWeaknesses: FeedbackFrequency[];
  commonSuggestions: FeedbackFrequency[];
}

interface AnalysisResultsProps {
  analysisSummary: AnalysisSummary;
  cachedPRIds: number[];
  newlyAnalyzedPRIds: number[];
  allAnalyzedPRIds?: number[];
}

export default function AnalysisResults({
  analysisSummary,
  cachedPRIds,
  newlyAnalyzedPRIds,
}: AnalysisResultsProps) {
  // Determine which PR IDs to highlight - now we'll use all PRs
  const displayedPRIds = [...cachedPRIds, ...newlyAnalyzedPRIds];

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <OverallSummary
        overallSummary={analysisSummary.overallSummary}
        averageScore={analysisSummary.averageScore}
      />

      {/* Common Strengths */}
      <div>
        <h4 className="sticky top-0 z-10 flex items-center font-semibold text-zinc-600 dark:text-zinc-400 mb-4 text-base border-b border-zinc-200 dark:border-zinc-700 pb-2 pt-4 bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 backdrop-blur supports-[backdrop-filter]:bg-opacity-60">
          {/* Strength Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-green-600 dark:text-green-400 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Code Strengths</span>
        </h4>
        <PRFeatureList
          features={analysisSummary.commonStrengths}
          type="strength"
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          displayedPRIds={displayedPRIds}
        />
      </div>

      {/* Common Weaknesses */}
      <div>
        <h4 className="sticky top-0 z-10 flex items-center font-semibold text-zinc-600 dark:text-zinc-400 mb-4 text-base border-b border-zinc-200 dark:border-zinc-700 pb-2 pt-4 bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 backdrop-blur supports-[backdrop-filter]:bg-opacity-60">
          {/* Weakness Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-red-600 dark:text-red-400 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Areas for Improvement</span>
        </h4>
        <PRFeatureList
          features={analysisSummary.commonWeaknesses}
          type="weakness"
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          displayedPRIds={displayedPRIds}
        />
      </div>

      {/* Suggested Improvements */}
      <div>
        <h4 className="sticky top-0 z-10 flex items-center font-semibold text-zinc-600 dark:text-zinc-400 mb-4 text-base border-b border-zinc-200 dark:border-zinc-700 pb-2 pt-4 bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 backdrop-blur supports-[backdrop-filter]:bg-opacity-60">
          {/* Suggestion Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
          <span>Growth Opportunities</span>
        </h4>
        <PRFeatureList
          features={analysisSummary.commonSuggestions}
          type="suggestion"
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          displayedPRIds={displayedPRIds}
        />
      </div>
    </div>
  );
}
