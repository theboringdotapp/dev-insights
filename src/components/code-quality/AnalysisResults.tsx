import React from "react";
import OverallSummary from "./analysis/OverallSummary";
import PRFeatureList from "./analysis/PRFeatureList";
import CacheLegend from "./analysis/CacheLegend";

interface Feature {
  text: string;
  count: number;
  prIds: number[];
  prUrls: string[];
  prTitles: string[];
}

interface AnalysisSummary {
  overallSummary: string;
  averageScore: number;
  commonStrengths: Feature[];
  commonWeaknesses: Feature[];
  commonSuggestions: Feature[];
}

interface AnalysisResultsProps {
  analysisSummary: AnalysisSummary;
  cachedPRIds: number[];
  newlyAnalyzedPRIds: number[];
  viewAllAnalyzedPRs?: boolean;
  allAnalyzedPRIds?: number[];
}

export default function AnalysisResults({
  analysisSummary,
  cachedPRIds,
  newlyAnalyzedPRIds,
  viewAllAnalyzedPRs = false,
  allAnalyzedPRIds = [],
}: AnalysisResultsProps) {
  // Determine which PR IDs to highlight
  const displayedPRIds = viewAllAnalyzedPRs
    ? allAnalyzedPRIds
    : [...cachedPRIds, ...newlyAnalyzedPRIds];

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <OverallSummary
        overallSummary={analysisSummary.overallSummary}
        averageScore={analysisSummary.averageScore}
      />

      {/* Cache status legend */}
      <CacheLegend
        cachedPRIds={cachedPRIds}
        newlyAnalyzedPRIds={newlyAnalyzedPRIds}
        viewAllAnalyzedPRs={viewAllAnalyzedPRs}
        allAnalyzedPRIds={allAnalyzedPRIds}
      />

      {/* Common Strengths */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-800 mb-3 text-lg">
          Code Strengths
        </h4>
        <PRFeatureList
          features={analysisSummary.commonStrengths}
          type="strength"
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          displayedPRIds={displayedPRIds}
          viewAllAnalyzedPRs={viewAllAnalyzedPRs}
        />
      </div>

      {/* Common Weaknesses */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-800 mb-3 text-lg">
          Areas for Improvement
        </h4>
        <PRFeatureList
          features={analysisSummary.commonWeaknesses}
          type="weakness"
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          displayedPRIds={displayedPRIds}
          viewAllAnalyzedPRs={viewAllAnalyzedPRs}
        />
      </div>

      {/* Suggested Improvements */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3 text-lg">
          Growth Opportunities
        </h4>
        <PRFeatureList
          features={analysisSummary.commonSuggestions}
          type="suggestion"
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          displayedPRIds={displayedPRIds}
          viewAllAnalyzedPRs={viewAllAnalyzedPRs}
        />
      </div>
    </div>
  );
}
