import React from "react";

interface AnalysisControlsProps {
  maxPRs: number;
  setMaxPRs: (maxPRs: number) => void;
  cachedCount: number;
  viewAllAnalyzedPRs: boolean;
  allAnalyzedPRIds: number[];
  handleToggleViewAllAnalyzed: () => void;
  isAnalyzing: boolean;
  hasApiKey: boolean;
  apiKey?: string;
  analysisSummary: unknown | null;
}

/**
 * Component for selecting analysis options and toggling view options
 * Note: The analyze button has been moved to the NoAnalyzedPRsState component
 */
export default function AnalysisControls({
  maxPRs,
  setMaxPRs,
  viewAllAnalyzedPRs,
  allAnalyzedPRIds,
  handleToggleViewAllAnalyzed,
  isAnalyzing,
  hasApiKey,
  apiKey,
  analysisSummary,
}: AnalysisControlsProps) {
  // Only show if we have an API key, are not currently analyzing, and have analysis or analyzed PRs
  if (
    !(hasApiKey || apiKey) ||
    isAnalyzing ||
    (!analysisSummary && allAnalyzedPRIds.length === 0)
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* PR Count Selector - only show if we have analysis to avoid duplication */}
      {analysisSummary && (
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
      )}

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
    </div>
  );
}
