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
      <h1 className="font-semibold text-lg dark:text-zinc-400 mb-4 text-left">
        {timeframeLabel} Timeline
      </h1>

      {/* Repository color legend */}
      {Object.keys(repoColors).length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(repoColors).map(([repo, colorClass]) => {
            const borderClass = colorClass.replace("bg-", "border-");
            return (
              <span
                key={repo}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ${borderClass} dark:border-opacity-70`}
              >
                {repo}
              </span>
            );
          })}
        </div>
      )}

      {/* PR count summary */}
      <div className="mb-3 text-sm text-zinc-500 dark:text-zinc-400 flex justify-end">
        <span>
          Showing {pullRequestCount} pull requests
          {isLikelyHittingLimit && maxItems > 0 && (
            <span className="text-blue-500 dark:text-blue-400 ml-1">
              (~{Math.round((pullRequestCount / maxItems) * 100)}% of limit)
            </span>
          )}
        </span>
      </div>
    </>
  );
}
