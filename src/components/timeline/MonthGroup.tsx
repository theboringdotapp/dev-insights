import React from "react";
import { PullRequestItem } from "../../lib/types";
import { PRMetrics } from "../../lib/types/metrics";
import PullRequestCard from "./PullRequestCard";

interface MonthGroupProps {
  month: string;
  pullRequests: PullRequestItem[];
  prCount: number;
  getRepoName: (url: string) => string;
  repoColors: Record<string, string>;
  getPRMetrics: (pr: PullRequestItem) => PRMetrics | null | undefined;
  loadPRMetrics: (pr: PullRequestItem) => void;
  isPRAnalyzed: (prId: number) => boolean;
  isAnalyzingPR: (prId: number) => boolean;
  hasApiKeys: boolean;
  handleAnalyzePR: (pr: PullRequestItem) => Promise<void>;
  handleReanalyzePR: (pr: PullRequestItem) => Promise<void>;
}

export default function MonthGroup({
  month,
  pullRequests,
  prCount,
  getRepoName,
  repoColors,
  getPRMetrics,
  loadPRMetrics,
  isPRAnalyzed,
  isAnalyzingPR,
  hasApiKeys,
  handleAnalyzePR,
  handleReanalyzePR,
}: MonthGroupProps) {
  return (
    <div className="mb-6">
      {/* Month header */}
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center relative z-10">
          <span className="text-white text-sm font-bold">
            {month.substring(0, 3)}
          </span>
        </div>
        <h4 className="text-lg font-medium ml-4">{month}</h4>
        <span className="ml-2 text-sm text-gray-500">({prCount} PRs)</span>
      </div>

      {/* PR items for this month */}
      <div className="ml-8 pl-8 border-l border-gray-200">
        {pullRequests.map((pr) => {
          const repoName = getRepoName(pr.html_url);
          const colorClass =
            repoColors[repoName] || "bg-gray-100 text-gray-800";
          const metrics = getPRMetrics(pr);
          const isAnalyzed = isPRAnalyzed(pr.id);
          const isCurrentlyAnalyzing = isAnalyzingPR(pr.id);

          return (
            <PullRequestCard
              key={pr.id}
              pr={pr}
              repoName={repoName}
              colorClass={colorClass}
              metrics={metrics}
              isAnalyzed={isAnalyzed}
              isCurrentlyAnalyzing={isCurrentlyAnalyzing}
              hasApiKeys={hasApiKeys}
              onLoadMetrics={loadPRMetrics}
              onAnalyzePR={handleAnalyzePR}
              onReanalyzePR={handleReanalyzePR}
            />
          );
        })}
      </div>
    </div>
  );
}
