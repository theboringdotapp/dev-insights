import React from "react";

interface EmptySelectionStateProps {
  onSelectAllPRs: () => void;
}

/**
 * Component to display when no PRs are selected but analysis is available
 */
export default function EmptySelectionState({
  onSelectAllPRs,
}: EmptySelectionStateProps) {
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-1">
        No PRs Selected
      </h3>
      <p className="text-gray-500 mb-4">
        Select at least one PR above to view its analysis.
      </p>
      <button
        onClick={onSelectAllPRs}
        className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors text-sm"
      >
        Select All PRs
      </button>
    </div>
  );
}
