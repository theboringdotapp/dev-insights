import { PullRequestItem } from "../lib/types";
import { useMemo } from "react";
import { usePRMetrics } from "../lib/usePRMetrics";
import { PRMetricsBadge } from "./ui/PRMetricsBadge";
import { CommitsList } from "./ui/CommitsList";
import { Timeframe } from "../components/TimeframeSelector";

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
  // Use the PR metrics hook for lazy loading
  const { getPRMetrics, loadPRMetrics } = usePRMetrics();

  // Calculate max items based on timeframe (matching the values in useGitHubService.ts)
  const maxItems = useMemo(() => {
    switch (timeframe) {
      case "3months":
        return 300;
      case "6months":
        return 500;
      case "1year":
        return 750;
      default:
        return 150;
    }
  }, [timeframe]);

  // Extract unique repositories and assign colors
  const { repoColors, getRepoName } = useMemo(() => {
    const repos = new Set<string>();
    const colorPalette = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
      "bg-indigo-100 text-indigo-800",
      "bg-pink-100 text-pink-800",
      "bg-cyan-100 text-cyan-800",
    ];

    // Extract repo names from PR URLs
    pullRequests.forEach((pr) => {
      const repoName = getRepoNameFromUrl(pr.html_url);
      if (repoName) repos.add(repoName);
    });

    // Assign colors to repositories
    const repoColors: Record<string, string> = {};
    Array.from(repos).forEach((repo, index) => {
      repoColors[repo] = colorPalette[index % colorPalette.length];
    });

    return {
      repoColors,
      getRepoName: (url: string) => getRepoNameFromUrl(url) || "Unknown",
    };
  }, [pullRequests]);

  // Function to extract repository name from GitHub URL
  function getRepoNameFromUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === "github.com") {
        const pathParts = parsedUrl.pathname.split("/");
        if (pathParts.length >= 3) {
          return `${pathParts[1]}/${pathParts[2]}`;
        }
      }
      return null;
    } catch {
      // Ignore malformed URLs
      return null;
    }
  }

  // Sort PRs by created date (most recent first)
  const sortedPullRequests = useMemo(() => {
    return [...pullRequests].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [pullRequests]);

  // Group pull requests by month and year
  const groupedPRs = useMemo(() => {
    return sortedPullRequests.reduce<Record<string, PullRequestItem[]>>(
      (groups, pr) => {
        const date = new Date(pr.created_at);
        const monthYear = `${date.toLocaleString("default", {
          month: "long",
        })} ${date.getFullYear()}`;

        if (!groups[monthYear]) {
          groups[monthYear] = [];
        }
        groups[monthYear].push(pr);
        return groups;
      },
      {}
    );
  }, [sortedPullRequests]);

  // Sort the groups by date (most recent first)
  const sortedMonths = useMemo(() => {
    return Object.keys(groupedPRs).sort((a, b) => {
      // Extract month and year to create proper Date objects
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");

      const dateA = new Date(`${monthA} 1, ${yearA}`);
      const dateB = new Date(`${monthB} 1, ${yearB}`);

      return dateB.getTime() - dateA.getTime();
    });
  }, [groupedPRs]);

  // Determine if we're likely hitting the limit
  const isLikelyHittingLimit = pullRequests.length >= maxItems - 5; // Using a small buffer

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">{timeframeLabel} Timeline</h3>

      {/* Repository color legend */}
      {Object.keys(repoColors).length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(repoColors).map(([repo, colorClass]) => (
            <span
              key={repo}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
            >
              {repo}
            </span>
          ))}
        </div>
      )}

      {/* PR count summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {pullRequests.length} pull requests
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {sortedMonths.map((month) => (
          <div key={month} className="mb-6">
            {/* Month header */}
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center relative z-10">
                <span className="text-white text-sm font-bold">
                  {month.substring(0, 3)}
                </span>
              </div>
              <h4 className="text-lg font-medium ml-4">{month}</h4>
              <span className="ml-2 text-sm text-gray-500">
                ({groupedPRs[month].length} PRs)
              </span>
            </div>

            {/* PR items for this month */}
            <div className="ml-8 pl-8 border-l border-gray-200">
              {groupedPRs[month].map((pr) => {
                const repoName = getRepoName(pr.html_url);
                const colorClass =
                  repoColors[repoName] || "bg-gray-100 text-gray-800";
                const metrics = getPRMetrics(pr);

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
                          className="text-blue-600 hover:underline font-medium"
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
                            onClick={() => loadPRMetrics(pr)}
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(pr.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>

                    {/* Commits list (only shown if metrics are loaded) */}
                    {metrics && metrics.isLoaded && !metrics.error && (
                      <CommitsList
                        commits={metrics.commits}
                        isLoaded={metrics.isLoaded}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Show message if we're likely hitting the API limit */}
        {isLikelyHittingLimit && (
          <div className="ml-12 mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">
            <p className="font-semibold">Pagination Limit</p>
            <p>
              Showing up to {maxItems} PRs from the selected timeframe (
              {timeframeLabel}). There might be more PRs available that aren't
              displayed here.
            </p>
            <p className="mt-1">
              Try selecting a shorter timeframe for more complete results or use
              more specific search criteria.
            </p>
          </div>
        )}

        {sortedMonths.length === 0 && (
          <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
            No pull requests found in the selected timeframe.
          </div>
        )}
      </div>
    </div>
  );
}
