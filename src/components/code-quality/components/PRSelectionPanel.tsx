import React from "react";
import { PullRequestItem } from "../../../lib/types";

interface PRSelectionPanelProps {
  prsToAnalyze: PullRequestItem[];
  allAnalyzedPRIds: number[];
  selectedPRIds: number[];
  loadingPRIds?: number[];
  onTogglePR: (prId: number) => void;
}

/**
 * Component to display selectable PR chips for analysis
 */
export default function PRSelectionPanel({
  prsToAnalyze,
  allAnalyzedPRIds,
  selectedPRIds,
  loadingPRIds = [],
  onTogglePR,
}: PRSelectionPanelProps) {
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Pull Requests in Analysis
      </h4>
      <div className="flex flex-wrap gap-2">
        {prsToAnalyze
          .filter((pr) => allAnalyzedPRIds.includes(pr.id))
          .map((pr) => (
            <div
              key={pr.id}
              onClick={() => onTogglePR(pr.id)}
              className={`px-3 py-1 text-xs rounded-full cursor-pointer flex items-center ${
                selectedPRIds.includes(pr.id)
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              #{pr.number} {pr.title.substring(0, 20)}
              {pr.title.length > 20 ? "..." : ""}
              <span
                className={`ml-1 w-2 h-2 rounded-full ${
                  selectedPRIds.includes(pr.id) ? "bg-blue-500" : "bg-gray-400"
                }`}
              ></span>
            </div>
          ))}
        {prsToAnalyze
          .filter(
            (pr) =>
              loadingPRIds.includes(pr.id) && !allAnalyzedPRIds.includes(pr.id)
          )
          .map((pr) => (
            <div
              key={`loading-${pr.id}`}
              className="px-3 py-1 text-xs rounded-full flex items-center bg-yellow-50 text-yellow-800 border border-yellow-200"
            >
              #{pr.number} {pr.title.substring(0, 20)}
              {pr.title.length > 20 ? "..." : ""}
              <div className="ml-2 w-3 h-3 border-t-2 border-blue-500 rounded-full animate-spin"></div>
            </div>
          ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Click on a PR to toggle its inclusion in the analysis.{" "}
        {selectedPRIds.length} of {allAnalyzedPRIds.length} PRs selected.
        {loadingPRIds.length > 0 && (
          <span className="ml-1 text-yellow-600">
            ({loadingPRIds.length} PR{loadingPRIds.length > 1 ? "s" : ""}{" "}
            loading...)
          </span>
        )}
      </p>
    </div>
  );
}
