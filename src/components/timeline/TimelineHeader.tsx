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
      <h1 className="font-semibold text-xl text-zinc-800 dark:text-zinc-300 mb-4 text-left flex items-center">
        {timeframeLabel} Timeline
      </h1>

      {/* Repository color legend */}
      {Object.keys(repoColors).length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(repoColors).map(([repo, colorClass]) => {
            const borderClass = colorClass.replace("bg-", "border-");
            return (
              <span
                key={repo}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-white/70 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 ${borderClass} dark:border-opacity-70`}
              >
                {repo}
              </span>
            );
          })}
        </div>
      )}

      {/* PR count summary */}
      <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <span>
          Showing {pullRequestCount} pull requests
          {isLikelyHittingLimit && maxItems > 0 && (
            <span className="text-purple-500 dark:text-purple-400 ml-1">
              (~{Math.round((pullRequestCount / maxItems) * 100)}% of limit)
            </span>
          )}
        </span>
      </div>
    </>
  );
}
