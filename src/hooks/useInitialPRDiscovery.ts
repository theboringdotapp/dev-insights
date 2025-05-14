import { useEffect, useRef } from "react";
import { PullRequestItem } from "../lib/types";
import { useAnalysisStore } from "../stores/analysisStore";
import cacheService from "../lib/cacheService";

interface UseInitialPRDiscoveryProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  useAllPRs: boolean;
}

/**
 * Custom hook to handle the initial discovery of analyzed PRs from cache
 * and set the initial selection when the component mounts.
 */
export function useInitialPRDiscovery({
  pullRequests,
  allPRs,
  useAllPRs,
}: UseInitialPRDiscoveryProps) {
  // Get actions from analysis store
  const { addAnalyzedPRIds, setSelectedPRIds } = useAnalysisStore();

  // Ref to track mounted state and prevent duplicate executions
  const isMountedRef = useRef(false);

  // Effect to discover analyzed PRs and set initial selection
  useEffect(() => {
    // Run only once on initial mount
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    console.log(
      "[useInitialPRDiscovery] RUNNING - Checking cache for new PRs..."
    );

    const discoverAndSetInitialSelection = async () => {
      let currentKnownIds = Array.from(
        useAnalysisStore.getState().allAnalyzedPRIds
      );
      console.log(
        `[useInitialPRDiscovery] Known analyzed IDs before check: ${
          currentKnownIds.join(", ") || "None"
        }`
      );

      // Determine PRs to check in cache (those not already known)
      const effectivePRsToCheck = useAllPRs && allPRs ? allPRs : pullRequests;
      const prIdsToCheckInCache = effectivePRsToCheck
        .map((pr) => pr.id)
        .filter((id) => !currentKnownIds.includes(id));

      let newlyFoundCachedIds: number[] = [];
      if (prIdsToCheckInCache.length > 0) {
        console.log(
          `[useInitialPRDiscovery] Checking cache for ${
            prIdsToCheckInCache.length
          } potential new PR IDs: ${prIdsToCheckInCache.join(", ")}`
        );
        try {
          const cacheResults = await Promise.all(
            prIdsToCheckInCache.map((id) => cacheService.getPRAnalysis(id))
          );
          newlyFoundCachedIds = cacheResults
            .filter((result) => result !== null)
            .map((result) => result!.prId);

          if (newlyFoundCachedIds.length > 0) {
            console.log(
              `[useInitialPRDiscovery] Found ${
                newlyFoundCachedIds.length
              } new analyzed PRs in cache. Adding IDs to store: ${newlyFoundCachedIds.join(
                ", "
              )}`
            );
            addAnalyzedPRIds(newlyFoundCachedIds);
            currentKnownIds = [...currentKnownIds, ...newlyFoundCachedIds];
          } else {
            console.log(
              "[useInitialPRDiscovery] No new analyzed PRs found in cache."
            );
          }
        } catch (error) {
          console.error(
            "[useInitialPRDiscovery] Error checking cache for new PRs:",
            error
          );
        }
      } else {
        console.log("[useInitialPRDiscovery] No new PRs to check in cache.");
      }

      // Set initial selection to ALL known analyzed PRs
      if (currentKnownIds.length > 0) {
        console.log(
          `[useInitialPRDiscovery] Setting initial selected PRs to ALL known analyzed IDs: ${currentKnownIds.join(
            ", "
          )}`
        );
        setSelectedPRIds(currentKnownIds);
      } else {
        console.log(
          `[useInitialPRDiscovery] No known analyzed PRs found, initial selection is empty.`
        );
        setSelectedPRIds([]);
      }

      console.log("[useInitialPRDiscovery] COMPLETED.");
    };

    discoverAndSetInitialSelection();
  }, [pullRequests, allPRs, useAllPRs, addAnalyzedPRIds, setSelectedPRIds]);
}
