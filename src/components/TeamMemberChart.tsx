import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PullRequestItem } from "../lib/types";
import { Timeframe } from "./TimeframeSelector";

interface TeamMemberChartProps {
  pullRequests: PullRequestItem[];
  reviews: unknown[];
  color: string;
  showOnlyImportantPRs: boolean;
  timeframe: Timeframe;
  maxYValue?: number; // For consistent scaling across charts
}

export function TeamMemberChart({
  pullRequests,
  reviews,
  color,
  showOnlyImportantPRs,
  timeframe,
  maxYValue,
}: TeamMemberChartProps) {
  // Helper function to get timeframe in days
  const getTimeframeDays = (timeframe: Timeframe): number => {
    const days = {
      "1week": 7,
      "1month": 30,
      "3months": 90,
      "6months": 180,
      "1year": 365,
    }[timeframe];
    return days;
  };

  // Helper function to get the start of a week (Sunday)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Helper function to format date as a week key
  const getWeekKey = (date: Date): string => {
    const weekStart = getWeekStart(date);
    return weekStart.toISOString().split("T")[0];
  };

  // Helper function to format week key for display
  const formatWeekKey = (weekKey: string): string => {
    const date = new Date(weekKey);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!pullRequests.length && !reviews.length) {
      return [];
    }

    // Create a map to store activity by week
    const weekMap: Record<
      string,
      {
        date: string;
        prs: number;
        reviews: number;
      }
    > = {};

    // Calculate timeframe boundaries
    const now = new Date();
    const timeframeDays = getTimeframeDays(timeframe);
    const startDate = new Date(
      now.getTime() - timeframeDays * 24 * 60 * 60 * 1000
    );

    // Calculate number of weeks to show based on timeframe
    const numberOfWeeks = Math.ceil(timeframeDays / 7);

    // Generate weeks within the timeframe
    for (let i = numberOfWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);

      // Only include weeks that are within our timeframe
      if (weekStart >= startDate) {
        const weekKey = getWeekKey(weekStart);
        const formattedDate = formatWeekKey(weekKey);

        weekMap[weekKey] = {
          date: formattedDate,
          prs: 0,
          reviews: 0,
        };
      }
    }

    // Count PRs by week (only within timeframe)
    pullRequests.forEach((pr) => {
      const prDate = new Date(pr.created_at);

      // Skip PRs outside the timeframe
      if (prDate < startDate) return;

      // Apply filtering if needed
      if (showOnlyImportantPRs) {
        const title = pr.title.toLowerCase().trim();
        const isImportant =
          title.startsWith("feat:") ||
          title.startsWith("fix:") ||
          title.startsWith("perf:") ||
          title.startsWith("refactor:") ||
          title.startsWith("security:") ||
          title.startsWith("feat(") ||
          title.startsWith("fix(") ||
          title.startsWith("perf(") ||
          title.startsWith("refactor(") ||
          title.startsWith("security(");

        if (!isImportant) return;
      }

      const weekKey = getWeekKey(prDate);

      if (weekMap[weekKey]) {
        weekMap[weekKey].prs += 1;
      }
    });

    // For reviews, distribute them across the weeks within timeframe
    // Apply the same filtering logic to reviews if showOnlyImportantPRs is enabled
    let filteredReviews = reviews;
    if (showOnlyImportantPRs) {
      // For teams view, we'll estimate that reviews follow the same pattern as PRs
      // Apply proportional filtering to reviews based on important PR ratio
      const totalPRs = pullRequests.length;
      const importantPRs = pullRequests.filter((pr) => {
        const title = pr.title.toLowerCase().trim();
        return (
          title.startsWith("feat:") ||
          title.startsWith("fix:") ||
          title.startsWith("perf:") ||
          title.startsWith("refactor:") ||
          title.startsWith("security:") ||
          title.startsWith("feat(") ||
          title.startsWith("fix(") ||
          title.startsWith("perf(") ||
          title.startsWith("refactor(") ||
          title.startsWith("security(")
        );
      }).length;

      // Apply the same ratio to reviews
      if (totalPRs > 0) {
        const importantRatio = importantPRs / totalPRs;
        const estimatedImportantReviews = Math.round(
          reviews.length * importantRatio
        );
        filteredReviews = reviews.slice(0, estimatedImportantReviews);
      } else {
        filteredReviews = [];
      }
    }

    const weekKeys = Object.keys(weekMap);
    const reviewsPerWeek =
      weekKeys.length > 0
        ? Math.ceil(filteredReviews.length / weekKeys.length)
        : 0;

    weekKeys.forEach((weekKey, index) => {
      // Distribute reviews somewhat evenly, with any remainder in the first weeks
      const remainder = filteredReviews.length % weekKeys.length;
      weekMap[weekKey].reviews =
        index < remainder ? reviewsPerWeek + 1 : reviewsPerWeek;
    });

    // Convert to array and sort by date
    return Object.entries(weekMap)
      .map(([weekKey, data]) => ({
        week: weekKey,
        ...data,
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
  }, [pullRequests, reviews, showOnlyImportantPRs, timeframe]);

  if (chartData.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-gray-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={{ stroke: "#9ca3af" }}
            axisLine={{ stroke: "#9ca3af" }}
            interval={chartData.length > 8 ? 1 : 0} // Skip some labels if too many weeks
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={{ stroke: "#9ca3af" }}
            axisLine={{ stroke: "#9ca3af" }}
            width={20}
            domain={[0, maxYValue || "dataMax"]}
            allowDataOverflow={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelFormatter={(label) => `Week of ${label}`}
            formatter={(value: number, name: string) => [
              value,
              name === "prs"
                ? showOnlyImportantPRs
                  ? "Important PRs"
                  : "PRs"
                : "Reviews",
            ]}
          />
          <Bar dataKey="prs" fill={color} opacity={0.7} radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="reviews"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2, fill: color }}
            activeDot={{ r: 3, fill: color }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
