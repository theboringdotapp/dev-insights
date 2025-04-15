import React from "react";

interface AnalysisControlsProps {
  maxPRs: number;
  setMaxPRs: (maxPRs: number) => void;
  cachedCount: number;
  viewAllAnalyzedPRs: boolean;
  allAnalyzedPRIds: number[];
  handleToggleViewAllAnalyzed: () => void;
  handleAnalyze: () => void;
  isAnalyzing: boolean;
  hasApiKey: boolean;
  apiKey?: string;
  analysisSummary: unknown | null;
}

/**
 * Component for selecting analysis options and triggering analysis
 */
export default function AnalysisControls({
  maxPRs,
  setMaxPRs,
  cachedCount,
  viewAllAnalyzedPRs,
  allAnalyzedPRIds,
  handleToggleViewAllAnalyzed,
  handleAnalyze,
  isAnalyzing,
  hasApiKey,
  apiKey,
  analysisSummary,
}: AnalysisControlsProps) {
  // Only show if we have an API key and are not currently analyzing
  if (!(hasApiKey || apiKey) || isAnalyzing) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* PR Count Selector */}
      <div className="flex items-center">
        <label className="mr-2 text-sm font-medium">Analyze:</label>
        <select
          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
          value={maxPRs}
          onChange={(e) => setMaxPRs(Number(e.target.value))}
          disabled={isAnalyzing}
        >
          <option value="3">3 PRs</option>
          <option value="5">5 PRs</option>
          <option value="10">10 PRs</option>
          <option value="15">15 PRs</option>
        </select>
      </div>

      {/* View All Analyzed Toggle - only show if there are analyzed PRs */}
      {allAnalyzedPRIds.length > 0 && (
        <div className="flex items-center ml-4">
          <input
            type="checkbox"
            id="viewAllAnalyzed"
            checked={viewAllAnalyzedPRs}
            onChange={handleToggleViewAllAnalyzed}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="viewAllAnalyzed" className="ml-2 text-sm">
            View all analyzed PRs ({allAnalyzedPRIds.length})
          </label>
        </div>
      )}

      {/* Button to perform analysis */}
      {!analysisSummary && (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !apiKey}
          className={`ml-auto px-3 py-1 rounded-md text-white text-sm ${
            isAnalyzing || !apiKey
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {cachedCount === maxPRs
            ? "Show Analysis"
            : cachedCount > 0
            ? `Analyze ${maxPRs - cachedCount} New PRs`
            : `Analyze ${maxPRs} PRs`}
        </button>
      )}
    </div>
  );
}
