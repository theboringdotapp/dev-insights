import { useMemo } from "react";
import { Timeframe } from "../components/TimeframeSelector";

export function useTimeframeInfo(
  timeframe: Timeframe,
  pullRequestCount: number
) {
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

  // Determine if we're likely hitting the limit
  const isLikelyHittingLimit = useMemo(() => {
    return pullRequestCount >= maxItems - 5; // Using a small buffer
  }, [pullRequestCount, maxItems]);

  return {
    maxItems,
    isLikelyHittingLimit,
  };
}
