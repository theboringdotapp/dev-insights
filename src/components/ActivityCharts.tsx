import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PullRequestItem, ReviewMetrics } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";

// Interface for the component props
interface ActivityChartsProps {
  pullRequests: PullRequestItem[];
  showOnlyImportantPRs: boolean;
  reviewMetrics?: ReviewMetrics[];
  onCommitDataLoaded?: (commitCount: number, isLoading: boolean) => void;
}

export function ActivityCharts({
  pullRequests,
  showOnlyImportantPRs,
  reviewMetrics = [],
  onCommitDataLoaded,
}: ActivityChartsProps) {
  const { getPRMetrics, loadPRMetrics } = usePRMetrics();
  const [isLoading, setIsLoading] = useState(true);
  const [realCommitCount, setRealCommitCount] = useState(0);
  const [loadedPRCount, setLoadedPRCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Calculate total reviews count (count unique PRs reviewed, not individual review submissions)
  const totalReviews = useMemo(() => {
    return reviewMetrics.length; // Each reviewMetric represents one PR reviewed
  }, [reviewMetrics]);

  // Define chart colors to match design system
  const colors = {
    pullRequests: "#8b5cf6", // Purple 500 - matching purple theme for interactive elements
    commits: "#10b981", // Emerald 500 - complementary to purple
    reviews: "#fb923c", // Orange 400 - pastel orange for reviews that matches brand
  };

  // Handle window resize for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Load PR metrics for all PRs if not already loaded
  useEffect(() => {
    if (!pullRequests.length) {
      setIsLoading(false);
      onCommitDataLoaded?.(0, false);
      return;
    }

    // Track if component is still mounted/effect is current
    let isCurrent = true;

    try {
      setIsLoading(true);
      setLoadedPRCount(0);
      setError(null);

      // Notify parent component that we're loading commit data
      onCommitDataLoaded?.(0, true);

      // Initialize counters
      let completedPRs = 0;
      let totalCommits = 0;

      // Check if we already have metrics for all PRs
      const allPRsHaveMetrics = pullRequests.every((pr) => {
        const metrics = getPRMetrics(pr);
        if (metrics?.isLoaded) {
          completedPRs++;
          totalCommits += metrics.commits?.length || 0;
          return true;
        }
        return false;
      });

      // If all PRs already have metrics, we're done
      if (allPRsHaveMetrics) {
        setRealCommitCount(totalCommits);
        setLoadedPRCount(pullRequests.length);
        setIsLoading(false);
        onCommitDataLoaded?.(totalCommits, false);
        return;
      }

      // Keep track of loading promises to facilitate cleanup
      const loadingPromises: Promise<void>[] = [];

      // Load metrics for each PR that doesn't have them
      pullRequests.forEach((pr) => {
        const metrics = getPRMetrics(pr);
        if (!metrics?.isLoaded && !metrics?.isLoading) {
          // Start loading metrics for this PR
          const loadPromise = loadPRMetrics(pr)
            .then((loadedMetrics) => {
              // Skip updating state if component unmounted or PR list changed
              if (!isCurrent) return;

              if (loadedMetrics) {
                completedPRs++;
                totalCommits += loadedMetrics.commits?.length || 0;

                // Update state to reflect progress
                setRealCommitCount(totalCommits);
                setLoadedPRCount(completedPRs);

                // Update parent with current commit count and loading state
                onCommitDataLoaded?.(
                  totalCommits,
                  completedPRs < pullRequests.length
                );

                // Set loading to false when all PRs are loaded
                if (completedPRs === pullRequests.length) {
                  setIsLoading(false);
                }
              }
            })
            .catch((err) => {
              // Skip updating state if component unmounted or PR list changed
              if (!isCurrent) return;

              console.error("Error loading PR metrics:", err);
              // Continue even if one PR fails to load
              completedPRs++;
              setLoadedPRCount(completedPRs);
              if (completedPRs === pullRequests.length) {
                setIsLoading(false);
                onCommitDataLoaded?.(totalCommits, false);
              }
            });

          loadingPromises.push(loadPromise);
        }
      });

      // Return cleanup function
      return () => {
        // Mark current effect as stale to prevent further state updates
        isCurrent = false;

        // Reset loading state in parent component on cleanup
        if (isLoading) {
          console.log("[ActivityCharts] Cleaning up ongoing data loading");
          onCommitDataLoaded?.(0, false);
        }
      };
    } catch (err) {
      console.error("Error in ActivityCharts useEffect:", err);
      setError("Failed to load PR metrics data");
      setIsLoading(false);
      onCommitDataLoaded?.(0, false);
    }
  }, [pullRequests, getPRMetrics, loadPRMetrics, onCommitDataLoaded]);

  // Generate activity data combining PR and commit frequencies
  const activityData = useMemo(() => {
    if (!pullRequests.length) return [];

    try {
      // Create a map to store activity by week
      const weekMap: Record<
        string,
        {
          date: string;
          prs: number;
          commits: number;
          reviews: number;
        }
      > = {};

      // Sort by creation date (ascending)
      const sortedPRs = [...pullRequests].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Get the date range
      const oldestPR = new Date(sortedPRs[0].created_at);
      const latestPR = new Date(sortedPRs[sortedPRs.length - 1].created_at);

      // Generate all weeks in the date range
      const currentDate = new Date(oldestPR);
      while (currentDate <= latestPR) {
        const weekKey = getWeekKey(currentDate);
        const formattedDate = formatDateForDisplay(currentDate, isMobile);

        weekMap[weekKey] = {
          date: formattedDate,
          prs: 0,
          commits: 0,
          reviews: 0,
        };

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
      }

      // Count PRs by week
      pullRequests.forEach((pr) => {
        const date = new Date(pr.created_at);
        const weekKey = getWeekKey(date);

        if (weekMap[weekKey]) {
          weekMap[weekKey].prs += 1;

          // Add real commit data if available
          const metrics = getPRMetrics(pr);
          if (metrics?.isLoaded && metrics.commits) {
            weekMap[weekKey].commits += metrics.commits.length;
          }
        }
      });

      // Count reviews by week (count unique PRs reviewed, not individual review submissions)
      reviewMetrics.forEach((reviewMetric) => {
        // Get the earliest review date for this PR to represent when the user first reviewed it
        const earliestReview = reviewMetric.userReviews.sort(
          (a, b) =>
            new Date(a.submitted_at).getTime() -
            new Date(b.submitted_at).getTime()
        )[0];

        if (earliestReview) {
          const date = new Date(earliestReview.submitted_at);
          const weekKey = getWeekKey(date);

          if (weekMap[weekKey]) {
            weekMap[weekKey].reviews += 1;
          }
        }
      });

      // Convert map to array and sort by date
      return Object.values(weekMap).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (err) {
      console.error("Error generating activity data:", err);
      setError("Failed to process activity data");
      return [];
    }
  }, [pullRequests, getPRMetrics, isMobile]);

  // Calculate loading progress percentage
  const loadingProgress = pullRequests.length
    ? Math.round((loadedPRCount / pullRequests.length) * 100)
    : 100;

  // If there's no data, show a message
  if (!pullRequests.length) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
        No pull request data available for analysis.
      </div>
    );
  }

  // If there was an error, show error message
  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg text-center text-red-500">
        {error}
      </div>
    );
  }

  // Get chart height based on screen size
  const chartHeight = isMobile ? 250 : 280;

  // Responsive margins for the chart
  const chartMargins = isMobile
    ? { top: 5, right: 10, left: 10, bottom: 50 }
    : { top: 5, right: 30, left: 20, bottom: 20 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200"
    >
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 text-left">
            PR-Based Activity
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Activity visualized from pull request data{" "}
            {showOnlyImportantPRs && "(important PRs only)"}
          </p>
        </div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg self-start"
          >
            <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2.5 mr-2 overflow-hidden">
              <motion.div
                className="bg-purple-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </div>
            <span className="whitespace-nowrap">
              {isMobile
                ? `${loadedPRCount}/${pullRequests.length}`
                : `Loading data (${loadedPRCount}/${pullRequests.length} PRs)`}
            </span>
          </motion.div>
        ) : (
          <div className="text-sm font-medium bg-gray-50 px-3 py-2 rounded-lg self-start">
            <span className="text-purple-700">{realCommitCount}</span> commits
            from <span className="text-purple-700">{pullRequests.length}</span>{" "}
            PRs, <span className="text-orange-600">{totalReviews}</span> reviews
          </div>
        )}
      </div>

      {activityData.length > 0 ? (
        <div
          className="p-2 sm:p-4 rounded-lg"
          style={{ height: `${chartHeight}px` }}
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={activityData} margin={chartMargins}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: isMobile ? 10 : 12 }}
                tickLine={{ stroke: "#9ca3af" }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 60 : 30}
              />
              <YAxis
                yAxisId="left"
                label={
                  isMobile
                    ? undefined
                    : {
                        value: "Commits",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#10b981",
                        fontSize: 12,
                        fontWeight: 500,
                        dy: 40,
                      }
                }
                tick={{ fill: "#6b7280", fontSize: isMobile ? 10 : 12 }}
                tickLine={{ stroke: "#9ca3af" }}
                width={isMobile ? 30 : 50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={
                  isMobile
                    ? undefined
                    : {
                        value: "PRs & Reviews",
                        angle: 90,
                        position: "insideRight",
                        fill: "#6b7280",
                        fontSize: 12,
                        fontWeight: 500,
                        dy: -40,
                      }
                }
                tick={{ fill: "#6b7280", fontSize: isMobile ? 10 : 12 }}
                tickLine={{ stroke: "#9ca3af" }}
                width={isMobile ? 30 : 50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e5e7eb",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: isMobile ? 0 : 20,
                  fontSize: isMobile ? 10 : 12,
                  marginBottom: isMobile ? 10 : 0,
                }}
                verticalAlign={isMobile ? "bottom" : "bottom"}
                height={isMobile ? 30 : 36}
              />
              <Bar
                yAxisId="left"
                dataKey="commits"
                name="Commits in PRs"
                fill={colors.commits}
                barSize={isMobile ? 16 : 24}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="prs"
                name="Pull Requests"
                stroke={colors.pullRequests}
                strokeWidth={3}
                activeDot={{ r: isMobile ? 6 : 8, fill: colors.pullRequests }}
                dot={{
                  r: isMobile ? 3 : 4,
                  strokeWidth: 2,
                  fill: "white",
                  stroke: colors.pullRequests,
                }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="reviews"
                name="Reviews Made"
                stroke={colors.reviews}
                strokeWidth={3}
                activeDot={{ r: isMobile ? 6 : 8, fill: colors.reviews }}
                dot={{
                  r: isMobile ? 3 : 4,
                  strokeWidth: 2,
                  fill: "white",
                  stroke: colors.reviews,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 bg-gray-50 p-4 rounded-lg flex items-center justify-center">
          <div className="text-gray-500">
            {isLoading
              ? "Loading chart data..."
              : "No activity data available to display"}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
        <p>
          Note: This chart only shows commits included in pull requests, not all
          repository commits.
        </p>
      </div>
    </motion.div>
  );
}

// Helper functions
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  // Get the ISO week number (1-52/53)
  const weekNum = getISOWeek(date);
  return `${year}-W${weekNum.toString().padStart(2, "0")}`;
}

function formatDateForDisplay(date: Date, isMobile: boolean = false): string {
  if (isMobile) {
    // More concise format for mobile
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
