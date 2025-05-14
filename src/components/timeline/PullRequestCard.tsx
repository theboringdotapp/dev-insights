import React, { useState, useEffect } from "react";
import {
  PullRequestItem,
  PullRequestMetrics,
  PRAnalysisResult,
} from "../../lib/types";
import { PRMetricsBadge } from "../ui/PRMetricsBadge";
import { CommitsList } from "../ui/CommitsList";
import AnalysisButton from "./AnalysisButton";
import PRAnalysisDetails from "./PRAnalysisDetails";
import { usePRMetrics } from "../../lib/usePRMetrics";

interface PullRequestCardProps {
  pr: PullRequestItem;
  repoName: string;
  colorClass: string;
  metrics: PullRequestMetrics | null | undefined;
  isAnalyzed: boolean;
  isCurrentlyAnalyzing: boolean;
  hasApiKeys: boolean;
  onLoadMetrics: (pr: PullRequestItem) => void;
  onAnalyzePR: (pr: PullRequestItem) => Promise<void>;
  onReanalyzePR: (pr: PullRequestItem) => Promise<void>;
}

export default function PullRequestCard({
  pr,
  repoName,
  colorClass,
  metrics,
  isAnalyzed,
  isCurrentlyAnalyzing,
  hasApiKeys,
  onLoadMetrics,
  onAnalyzePR,
  onReanalyzePR,
}: PullRequestCardProps) {
  // States for tracking analysis information
  const [analysisResult, setAnalysisResult] = useState<PRAnalysisResult | null>(
    null
  );
  const [justAnalyzed, setJustAnalyzed] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // Get necessary hooks and functions
  const { getAnalysisFromMemoryCache, getAnalysisForPR } = usePRMetrics();

  // Effect to load analysis when PR is analyzed
  useEffect(() => {
    // Track if the effect is still mounted to prevent state updates after unmount
    let isMounted = true;

    if (isAnalyzed && !analysisResult && !isLoadingAnalysis) {
      const fetchAnalysis = async () => {
        if (!isMounted) return;
        setIsLoadingAnalysis(true);

        // First try memory cache
        let result = getAnalysisFromMemoryCache(pr.id);

        // If not in memory, try persistent storage
        if (!result) {
          try {
            result = await getAnalysisForPR(pr.id);
          } catch (error) {
            console.error(
              `Error fetching analysis for PR #${pr.number}:`,
              error
            );
          }
        }

        // Only update state if still mounted
        if (isMounted) {
          // Log when we successfully get a result to help with debugging
          if (result) {
            console.log(
              `[PullRequestCard] Analysis loaded for PR #${pr.number}`,
              result
            );
          } else {
            console.warn(
              `[PullRequestCard] No analysis found for PR #${pr.number} even though isAnalyzed=true`
            );
          }
          setAnalysisResult(result);
          setIsLoadingAnalysis(false);
        }
      };

      fetchAnalysis();
    } else if (isAnalyzed && isLoadingAnalysis && !analysisResult) {
      // If we've been loading for a while without getting a result, try again
      // (handles potential race conditions with cache updates)
      console.log(
        `[PullRequestCard] Still loading analysis for PR #${pr.number}, retrying...`
      );
      const retryTimeout = setTimeout(async () => {
        if (!isMounted) return;

        try {
          const result = await getAnalysisForPR(pr.id);
          if (isMounted) {
            setAnalysisResult(result);
            setIsLoadingAnalysis(false);
          }
        } catch (error) {
          console.error(
            `[PullRequestCard] Retry error for PR #${pr.number}:`,
            error
          );
          if (isMounted) {
            setIsLoadingAnalysis(false);
          }
        }
      }, 2000); // Retry after 2 seconds

      return () => {
        clearTimeout(retryTimeout);
      };
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
    // Dependencies include all relevant state and props
  }, [
    isAnalyzed,
    pr.id,
    pr.number,
    getAnalysisFromMemoryCache,
    getAnalysisForPR,
    analysisResult,
    isLoadingAnalysis,
  ]);

  // When isCurrentlyAnalyzing changes from true to false, set justAnalyzed to true
  useEffect(() => {
    // We only care about the transition from analyzing to not analyzing
    const hasFinishedAnalyzing = !isCurrentlyAnalyzing && isAnalyzed;

    // Only set justAnalyzed if it's not already set and analysis just finished
    if (hasFinishedAnalyzing && !justAnalyzed) {
      // Track previous state to avoid repeated triggers
      const timer = setTimeout(() => {
        setJustAnalyzed(false);
      }, 5000);

      setJustAnalyzed(true);
      return () => clearTimeout(timer);
    }
    // Remove justAnalyzed from dependencies to prevent re-triggering when it changes
  }, [isCurrentlyAnalyzing, isAnalyzed]);

  // Reset state when PR changes (prevent stale data)
  useEffect(() => {
    // Initial mount - nothing to clean up yet

    // When pr.id changes, reset state before processing the new PR
    return () => {
      setAnalysisResult(null);
      setJustAnalyzed(false);
      setIsLoadingAnalysis(false);
    };
  }, [pr.id]);

  // Simplified border class extraction for repo badge
  const repoBorderClass = colorClass.includes("bg-")
    ? colorClass.replace("bg-", "border-")
    : "border-gray-300";

  console.log(
    `[PullRequestCard] Rendering PR #${pr.number}. hasApiKeys prop: ${hasApiKeys}`
  );

  return (
    <div
      key={pr.id}
      // Added relative, adjusted padding for top-left button space on mobile
      className="relative pt-12 pb-4 px-3 sm:pt-4 sm:px-4 bg-white dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-700/30 shadow-sm"
    >
      {/* Stack vertically on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
        {/* Left section (Title, Badges) */}
        <div className="flex flex-col">
          {/* Link with PR number */}
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            // Muted link color, added PR number
            className="text-zinc-700 dark:text-zinc-300 hover:underline font-medium text-left mb-1.5"
          >
            <span className="text-zinc-500 dark:text-zinc-400">
              #{pr.number}
            </span>{" "}
            {pr.title}
          </a>
          <div className="flex flex-wrap items-center mt-1 gap-2">
            {/* Repository badge - styled as pill */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 ${repoBorderClass} dark:border-opacity-70`}
            >
              {repoName}
            </span>

            {/* PR state badge - styled as pill */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/50 ${
                pr.state === "open"
                  ? "text-green-600 dark:text-green-400"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {pr.state}
            </span>

            {/* PR metrics with lazy loading - (Styling handled in PRMetricsBadge) */}
            <PRMetricsBadge
              metrics={metrics}
              onClick={() => onLoadMetrics(pr)}
            />
          </div>
        </div>
        {/* Right section (Date, Button) - Reverted mobile positioning changes */}
        <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0 mt-3 sm:mt-0 sm:ml-4">
          {/* Muted date color */}
          <div className="text-sm text-zinc-400 dark:text-zinc-500">
            {new Date(pr.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
          {/* PR Analysis Buttons / Prompt - Conditional positioning */}
          {hasApiKeys ? (
            <>
              {/* Mobile Button (Top Left) */}
              <span className="absolute top-3 left-3 block sm:hidden z-10">
                <AnalysisButton
                  pr={pr}
                  isAnalyzed={isAnalyzed}
                  isAnalyzing={isCurrentlyAnalyzing}
                  onAnalyze={onAnalyzePR}
                  onReanalyze={onReanalyzePR}
                />
              </span>
              {/* Desktop Button (Bottom Right Flow) */}
              <div className="hidden sm:block mt-auto sm:mt-0 ml-auto sm:ml-0">
                <AnalysisButton
                  pr={pr}
                  isAnalyzed={isAnalyzed}
                  isAnalyzing={isCurrentlyAnalyzing}
                  onAnalyze={onAnalyzePR}
                  onReanalyze={onReanalyzePR}
                />
              </div>
            </>
          ) : (
            <>
              {/* Mobile Prompt (Top Left) */}
              <span className="absolute top-3 left-3 block sm:hidden text-xs text-gray-400 dark:text-gray-500 p-1 bg-gray-100 dark:bg-gray-800 rounded">
                Configure API Key
              </span>
              {/* Desktop Prompt (Bottom Right Flow) */}
              <div className="hidden sm:block mt-auto sm:mt-0 ml-auto sm:ml-0 text-xs text-gray-400 dark:text-gray-500">
                Configure API Key for Analysis
              </div>
            </>
          )}
        </div>
      </div>

      {/* Commits list (only shown if metrics are loaded) */}
      {metrics && metrics.isLoaded && !metrics.error && metrics.commits && (
        <div className="mt-3">
          <CommitsList commits={metrics.commits} isLoaded={metrics.isLoaded} />
        </div>
      )}

      {/* PR Analysis Details (only shown if PR has been analyzed) */}
      {isAnalyzed && (
        <div>
          {isLoadingAnalysis ? (
            <div className="py-2.5 px-3 border border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10 rounded-md text-xs text-purple-600 dark:text-purple-400 flex items-center">
              <svg
                className="animate-spin mr-2 h-3 w-3 text-purple-600 dark:text-purple-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading analysis results... This may take a moment.
            </div>
          ) : analysisResult && !analysisResult.error ? (
            <PRAnalysisDetails
              analysisResult={analysisResult}
              defaultOpen={isCurrentlyAnalyzing || justAnalyzed} // Auto-expand if just analyzed
            />
          ) : (
            <div className="py-2.5 px-3 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-600 dark:text-zinc-400 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Analysis complete. Click "Re-analyze" to refresh results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
