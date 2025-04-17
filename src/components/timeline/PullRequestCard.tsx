import React from "react";
import { PullRequestItem, PullRequestMetrics } from "../../lib/types";
import { PRMetricsBadge } from "../ui/PRMetricsBadge";
import { CommitsList } from "../ui/CommitsList";
import AnalysisButton from "./AnalysisButton";

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
      className="relative mb-4 pt-12 pb-3 px-3 sm:pt-4 sm:px-4 bg-white dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-700/50"
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
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ${repoBorderClass} dark:border-opacity-70`}
            >
              {repoName}
            </span>

            {/* PR state badge - styled as pill */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                pr.state === "open"
                  ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600"
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
          {/* PR Analysis Buttons - Conditional positioning based on screen size */}
          {hasApiKeys && (
            <>
              {/* Mobile Button (Top Left) - Handles all states */}
              <span className="absolute top-3 left-3 block sm:hidden">
                <AnalysisButton
                  pr={pr}
                  isAnalyzed={isAnalyzed}
                  isAnalyzing={isCurrentlyAnalyzing}
                  onAnalyze={onAnalyzePR}
                  onReanalyze={onReanalyzePR}
                />
              </span>

              {/* Desktop Button (Bottom Right Flow) - Handles all states */}
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
          )}
        </div>
      </div>

      {/* Commits list (only shown if metrics are loaded) */}
      {metrics && metrics.isLoaded && !metrics.error && metrics.commits && (
        <CommitsList commits={metrics.commits} isLoaded={metrics.isLoaded} />
      )}
    </div>
  );
}
