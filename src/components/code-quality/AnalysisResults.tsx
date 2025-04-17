import React from "react";
import OverallSummary from "./analysis/OverallSummary";
import PRFeatureList from "./analysis/PRFeatureList";
import { FeedbackFrequency } from "../../lib/types";
import { Button } from "../ui/button";
import { Sparkles, Loader2 } from "lucide-react";

// REMOVED unused interface definition
// interface AnalysisResultsDisplayProps { ... }

interface AnalysisResultsProps {
  commonStrengths: FeedbackFrequency[];
  commonWeaknesses: FeedbackFrequency[];
  commonSuggestions: FeedbackFrequency[];
  averageScore: number;
  careerDevelopmentSummary: string | null;
  isGeneratingSummary: boolean;
  selectedPRIds: number[];
  allAnalyzedPRIds?: number[];
  onGenerateSummary: () => Promise<void>;
  canGenerateSummary: boolean;
}

export default function AnalysisResults({
  commonStrengths,
  commonWeaknesses,
  commonSuggestions,
  averageScore,
  careerDevelopmentSummary,
  isGeneratingSummary,
  selectedPRIds,
  onGenerateSummary,
  canGenerateSummary,
}: AnalysisResultsProps) {
  const displayedPRIds = selectedPRIds;

  const hasThemes =
    commonStrengths.length > 0 ||
    commonWeaknesses.length > 0 ||
    commonSuggestions.length > 0;

  return (
    <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      {/* Overall Summary Section - Always shows structure */}
      <OverallSummary
        careerDevelopmentSummary={careerDevelopmentSummary}
        averageScore={averageScore}
        isGeneratingSummary={isGeneratingSummary}
      />

      {/* Button to Generate Summary (Show if needed and possible) */}
      {!careerDevelopmentSummary &&
        canGenerateSummary &&
        !isGeneratingSummary && (
          <div className="text-center p-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={onGenerateSummary} disabled={isGeneratingSummary}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Career Development Summary
              {isGeneratingSummary && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Generates an AI summary based on the selected PRs (or all analyzed
              PRs if none selected).
            </p>
          </div>
        )}

      {/* Placeholder if cannot generate summary (e.g., missing API key) */}
      {!careerDevelopmentSummary &&
        !canGenerateSummary &&
        !isGeneratingSummary && (
          <div className="text-center p-4 border-t border-gray-200 dark:border-gray-700 text-muted-foreground italic">
            Configure API Key in settings to generate summary.
          </div>
        )}

      {/* Detailed Results (Show if themes exist, regardless of summary) */}
      {hasThemes && (
        <>
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
            {commonStrengths.length > 0 ? (
              <PRFeatureList
                features={commonStrengths}
                type="strength"
                displayedPRIds={displayedPRIds}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic px-4">
                No specific strengths identified across selected PRs.
              </p>
            )}
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
            {commonWeaknesses.length > 0 ? (
              <PRFeatureList
                features={commonWeaknesses}
                type="weakness"
                displayedPRIds={displayedPRIds}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic px-4">
                No common areas for improvement identified.
              </p>
            )}
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
            {commonSuggestions.length > 0 ? (
              <PRFeatureList
                features={commonSuggestions}
                type="suggestion"
                displayedPRIds={displayedPRIds}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic px-4">
                No specific growth opportunities identified.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
