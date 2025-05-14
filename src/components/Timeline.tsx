import React, { useEffect } from "react";
import { PullRequestItem, PullRequestMetrics } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { Timeframe } from "./TimeframeSelector";
import { useRepositoryColors } from "../hooks/useRepositoryColors";
import { usePRAnalysis } from "../hooks/usePRAnalysis";
import { usePRGroups } from "../hooks/usePRGroups";
import { useTimeframeInfo } from "../hooks/useTimeframeInfo";
import { useAPIConfiguration } from "../hooks/useAPIConfiguration";
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
  const { isAnalyzingPR, isPRAnalyzed, handleAnalyzePR, handleReanalyzePR } =
    usePRAnalysis(pullRequests);

  // Get API key status directly to ensure reactivity
  const { apiKey } = useAPIConfiguration();
  const hasApiKey = !!apiKey;
  console.log(`[Timeline] Rendering. hasApiKey from config hook: ${hasApiKey}`);

  // Use PR grouping hook
  const { groupedPRs, sortedMonths } = usePRGroups(pullRequests);

  // Use timeframe info hook
  const { maxItems, isLikelyHittingLimit } = useTimeframeInfo(
    timeframe,
    pullRequests.length
  );

  // Only load metrics for visible PRs
  /*  useEffect(() => {
    // Only preload for PRs that don't already have metrics
    const prsToLoad = pullRequests.filter(
      (pr) =>
        !metricsCache[pr.id] ||
        (!metricsCache[pr.id].isLoaded && !metricsCache[pr.id].isLoading),
    );

    // Load metrics for first 10 visible PRs to improve initial display
    if (prsToLoad.length > 0) {
      prsToLoad.slice(0, 10).forEach((pr) => {
        loadPRMetrics(pr);
      });
    }
  }, [pullRequests, metricsCache, loadPRMetrics]); */

  // Wrapper function to ensure getPRMetrics output matches MonthGroup prop type
  // Simplified: Directly return the cached metrics object
  const getMetricsForTimeline = (
    pr: PullRequestItem
  ): PullRequestMetrics | undefined => {
    return getPRMetrics(pr);
  };

  return (
    <div className="p-1 sm:p-6 bg-white dark:bg-zinc-900/30">
      {/* Header */}
      <TimelineHeader
        timeframeLabel={timeframeLabel}
        repoColors={repoColors}
        pullRequestCount={pullRequests.length}
        maxItems={maxItems}
        isLikelyHittingLimit={isLikelyHittingLimit}
      />

      <div className="relative pt-2">
        {/* Month groups */}
        {sortedMonths.map((month) => (
          <MonthGroup
            key={month}
            month={month}
            pullRequests={groupedPRs[month]}
            getRepoName={getRepoName}
            repoColors={repoColors}
            getPRMetrics={getMetricsForTimeline}
            loadPRMetrics={loadPRMetrics}
            isPRAnalyzed={isPRAnalyzed}
            isAnalyzingPR={isAnalyzingPR}
            hasApiKeys={hasApiKey}
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
