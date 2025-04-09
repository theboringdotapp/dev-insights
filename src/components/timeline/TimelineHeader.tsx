import React from "react";

interface TimelineHeaderProps {
  timeframeLabel: string;
  repoColors: Record<string, string>;
  pullRequestCount: number;
  maxItems: number;
  isLikelyHittingLimit: boolean;
}

export default function TimelineHeader({
  timeframeLabel,
  repoColors,
  pullRequestCount,
  maxItems,
  isLikelyHittingLimit,
}: TimelineHeaderProps) {
  return (
    <>
      <h3 className="text-xl font-semibold mb-4">{timeframeLabel} Timeline</h3>

      {/* Repository color legend */}
      {Object.keys(repoColors).length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(repoColors).map(([repo, colorClass]) => (
            <span
              key={repo}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
            >
              {repo}
            </span>
          ))}
        </div>
      )}

      {/* PR count summary - now aligned right with percentage */}
      <div className="mb-4 text-sm text-gray-600 flex justify-end">
        <span className="bg-gray-100 px-2 py-1 rounded">
          Showing {pullRequestCount} pull requests
          {isLikelyHittingLimit && maxItems > 0 && (
            <span className="text-blue-600 ml-1">
              (~{Math.round((pullRequestCount / maxItems) * 100)}% of limit)
            </span>
          )}
        </span>
      </div>
    </>
  );
}
