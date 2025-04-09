import React from "react";

interface LimitMessageProps {
  maxItems: number;
  timeframeLabel: string;
}

function LimitMessage({ maxItems, timeframeLabel }: LimitMessageProps) {
  return (
    <div className="ml-12 mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">
      <p className="font-semibold">Pagination Limit</p>
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
    <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
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
