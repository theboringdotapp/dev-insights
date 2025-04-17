import React from "react";

interface LimitMessageProps {
  maxItems: number;
  timeframeLabel: string;
}

function LimitMessage({ maxItems, timeframeLabel }: LimitMessageProps) {
  return (
    <div className="ml-4 mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/60 text-blue-700 dark:text-blue-200 rounded-md text-sm shadow-sm">
      <p className="font-semibold mb-1">Pagination Limit</p>
      <p>
        Showing up to {maxItems} PRs from the selected timeframe (
        {timeframeLabel}). There might be more PRs available that aren't
        displayed here.
      </p>
      <p className="mt-1">
        Try selecting a shorter timeframe for more complete results or use more
        specific search criteria.
      </p>
    </div>
  );
}

interface EmptyStateProps {
  display: boolean;
}

function EmptyState({ display }: EmptyStateProps) {
  if (!display) return null;

  return (
    <div className="mt-4 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-md text-center text-zinc-500 dark:text-zinc-400 text-sm">
      No pull requests found in the selected timeframe.
    </div>
  );
}

interface TimelineMessagesProps {
  isLikelyHittingLimit: boolean;
  maxItems: number;
  timeframeLabel: string;
  isEmpty: boolean;
}

export default function TimelineMessages({
  isLikelyHittingLimit,
  maxItems,
  timeframeLabel,
  isEmpty,
}: TimelineMessagesProps) {
  return (
    <>
      {isLikelyHittingLimit && (
        <LimitMessage maxItems={maxItems} timeframeLabel={timeframeLabel} />
      )}
      <EmptyState display={isEmpty} />
    </>
  );
}
