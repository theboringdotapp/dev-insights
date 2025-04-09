import React from "react";
import { PullRequestItem } from "../../lib/types";
import { PRMetrics } from "../../lib/types/metrics";
import { PRMetricsBadge } from "../ui/PRMetricsBadge";
import { CommitsList } from "../ui/CommitsList";
import AnalysisButton from "./AnalysisButton";

interface PullRequestCardProps {
  pr: PullRequestItem;
  repoName: string;
  colorClass: string;
  metrics: PRMetrics | null | undefined;
  isAnalyzed: boolean;
  isCurrentlyAnalyzing: boolean;
  hasApiKeys: boolean;
  isAnalyzing: boolean;
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
  isAnalyzing,
  onLoadMetrics,
  onAnalyzePR,
  onReanalyzePR,
}: PullRequestCardProps) {
  return (
    <div
      key={pr.id}
      className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium text-left"
          >
            {pr.title}
          </a>
          <div className="flex flex-wrap mt-1.5 gap-2">
            {/* Repository badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
            >
              {repoName}
            </span>

            {/* PR state badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                pr.state === "open"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {pr.state}
            </span>

            {/* PR metrics with lazy loading */}
            <PRMetricsBadge
              metrics={metrics}
              onClick={() => onLoadMetrics(pr)}
            />

            {/* AI Analysis badge */}
            {isAnalyzed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Analyzed
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-sm text-gray-500">
            {new Date(pr.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>

          {/* PR Analysis Buttons */}
          {hasApiKeys && !isAnalyzing && (
            <AnalysisButton
              pr={pr}
              isAnalyzed={isAnalyzed}
              isAnalyzing={isCurrentlyAnalyzing}
              onAnalyze={onAnalyzePR}
              onReanalyze={onReanalyzePR}
            />
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
