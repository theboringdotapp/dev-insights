
import { PullRequestItem, PullRequestMetrics } from "../../lib/types";
import PullRequestCard from "./PullRequestCard";

interface MonthGroupProps {
  month: string;
  pullRequests: PullRequestItem[];
  getRepoName: (url: string) => string;
  repoColors: Record<string, string>;
  getPRMetrics: (pr: PullRequestItem) => PullRequestMetrics | null | undefined;
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
    <div className="mb-4 relative">
      {/* Month header - Reduce horizontal padding on mobile */}
      <h4 className="sticky top-0 z-10 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left border-b border-zinc-200 dark:border-zinc-700/50 pb-2 pt-3 px-2 sm:px-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-opacity-80">
        {month}
      </h4>

      {/* PR items - Adjust margin/padding */}
      <div className="pt-3 pl-2 sm:pl-4 space-y-3">
        {pullRequests.map((pr) => {
          const repoName = getRepoName(pr.html_url);
          const colorClass =
            repoColors[repoName] || "bg-zinc-100 text-zinc-800";
          const metrics: PullRequestMetrics | null | undefined =
            getPRMetrics(pr);
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
