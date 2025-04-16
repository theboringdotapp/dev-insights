import React, { useEffect } from "react";
import { PullRequestItem, PullRequestMetrics, CommitItem } from "../lib/types";
import { PRMetrics, Commit } from "../lib/types/metrics";
import { usePRMetrics } from "../lib/usePRMetrics";
import { Timeframe } from "./TimeframeSelector";
import { useRepositoryColors } from "../hooks/useRepositoryColors";
import { usePRAnalysis } from "../hooks/usePRAnalysis";
import { usePRGroups } from "../hooks/usePRGroups";
import { useTimeframeInfo } from "../hooks/useTimeframeInfo";
import TimelineHeader from "./timeline/TimelineHeader";
import MonthGroup from "./timeline/MonthGroup";
import TimelineMessages from "./timeline/TimelineMessages";

interface TimelineProps {
  pullRequests: PullRequestItem[];
  timeframeLabel: string;
  timeframe?: Timeframe;
}

export function Timeline({
  pullRequests,
  timeframeLabel,
  timeframe = "1month",
}: TimelineProps) {
  // Use PR metrics hook for lazy loading
  const { getPRMetrics, loadPRMetrics, metricsCache } = usePRMetrics();

  // Use repository colors hook
  const { repoColors, getRepoName } = useRepositoryColors(pullRequests);

  // Use PR analysis hook
  const {
    hasApiKeys,
    isAnalyzingPR,
    isPRAnalyzed,
    handleAnalyzePR,
    handleReanalyzePR,
  } = usePRAnalysis(pullRequests);

  // Use PR grouping hook
  const { groupedPRs, sortedMonths } = usePRGroups(pullRequests);

  // Use timeframe info hook
  const { maxItems, isLikelyHittingLimit } = useTimeframeInfo(
    timeframe,
    pullRequests.length
  );

  // Only load metrics for visible PRs
  useEffect(() => {
    // Only preload for PRs that don't already have metrics
    const prsToLoad = pullRequests.filter(
      (pr) =>
        !metricsCache[pr.id] ||
        (!metricsCache[pr.id].isLoaded && !metricsCache[pr.id].isLoading)
    );

    // Load metrics for first 10 visible PRs to improve initial display
    if (prsToLoad.length > 0) {
      prsToLoad.slice(0, 10).forEach((pr) => {
        loadPRMetrics(pr);
      });
    }
  }, [pullRequests, metricsCache, loadPRMetrics]);

  // Wrapper function to ensure getPRMetrics output matches MonthGroup prop type
  const getMetricsForTimeline = (pr: PullRequestItem): PRMetrics => {
    const metricsData: PullRequestMetrics | undefined = getPRMetrics(pr);

    // Map CommitItem[] to Commit[] required by PRMetrics from metrics.ts
    const mappedCommits: Commit[] | undefined = metricsData?.commits?.map(
      (commitItem: CommitItem) => ({
        sha: commitItem.sha,
        message: commitItem.commit?.message ?? "(No commit message)",
        author: "(Unknown author)", // Placeholder - CommitItem doesn't have author
        date: "(Unknown date)", // Placeholder - CommitItem doesn't have date
        url: commitItem.html_url ?? commitItem.url, // Prefer html_url if available
      })
    );

    // Provide default values if metrics aren't loaded yet
    return {
      prId: pr.id,
      isLoaded: metricsData?.isLoaded ?? false,
      isLoading: metricsData?.isLoading ?? false,
      changeRequestCount: metricsData?.changeRequestCount ?? 0,
      durationInDays: metricsData?.durationInDays ?? 0,
      commentCount: metricsData?.commentCount ?? 0,
      commits: mappedCommits,
      // Add other optional fields from PRMetrics if needed, setting defaults
      additions: undefined, // Example: Set default if not present in PullRequestMetrics
      deletions: undefined,
      changedFiles: undefined,
      commitCount: metricsData?.commits?.length, // Calculate from commits array
      error: metricsData?.error,
    };
  };

  return (
    <div className="mt-8">
      {/* Header */}
      <TimelineHeader
        timeframeLabel={timeframeLabel}
        repoColors={repoColors}
        pullRequestCount={pullRequests.length}
        maxItems={maxItems}
        isLikelyHittingLimit={isLikelyHittingLimit}
      />

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Month groups */}
        {sortedMonths.map((month) => (
          <MonthGroup
            key={month}
            month={month}
            pullRequests={groupedPRs[month]}
            prCount={groupedPRs[month].length}
            getRepoName={getRepoName}
            repoColors={repoColors}
            getPRMetrics={getMetricsForTimeline}
            loadPRMetrics={loadPRMetrics}
            isPRAnalyzed={isPRAnalyzed}
            isAnalyzingPR={isAnalyzingPR}
            hasApiKeys={hasApiKeys}
            handleAnalyzePR={handleAnalyzePR}
            handleReanalyzePR={handleReanalyzePR}
          />
        ))}

        {/* Messages */}
        <TimelineMessages
          isLikelyHittingLimit={isLikelyHittingLimit}
          maxItems={maxItems}
          timeframeLabel={timeframeLabel}
          isEmpty={sortedMonths.length === 0}
        />
      </div>
    </div>
  );
}
