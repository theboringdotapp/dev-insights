import { useMemo } from "react";
import { PullRequestItem } from "../lib/types";

export function usePRGroups(pullRequests: PullRequestItem[]) {
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

  return {
    sortedPullRequests,
    groupedPRs,
    sortedMonths,
  };
}
