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
}

export default function AnalysisResults({
  analysisSummary,
  cachedPRIds,
  newlyAnalyzedPRIds,
}: AnalysisResultsProps) {
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
        />
      </div>
    </div>
  );
}
