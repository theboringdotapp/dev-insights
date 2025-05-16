import { useEffect, useRef } from "react";
import { PullRequestItem } from "../lib/types";
import { useAnalysisStore } from "../stores/analysisStore";
import cacheService from "../lib/cacheService";
import { useDeveloperContext } from "../contexts/DeveloperContext";

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

  // Get the developer ID from context
  const { developerId } = useDeveloperContext();

  // Ref to track developer ID to detect changes
  const prevDeveloperIdRef = useRef<string | null>(null);
  // Ref to track mounted state and prevent duplicate executions
  const isMountedRef = useRef(false);

  // Reset when developer ID changes
  useEffect(() => {
    if (
      prevDeveloperIdRef.current &&
      prevDeveloperIdRef.current !== developerId
    ) {
      console.log(
        `[useInitialPRDiscovery] Developer changed from ${prevDeveloperIdRef.current} to ${developerId}, resetting discovery state`
      );
      isMountedRef.current = false;
    }

    prevDeveloperIdRef.current = developerId;
  }, [developerId]);

  // Effect to discover analyzed PRs and set initial selection
  useEffect(() => {
    // Skip discovery if no developer ID yet
    if (!developerId) {
      console.log(
        "[useInitialPRDiscovery] No developer ID available, deferring cache check"
      );
      return;
    }

    // Run only once per developer ID
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    console.log(
      `[useInitialPRDiscovery] RUNNING - Checking cache for ${developerId}'s PRs...`
    );

    const discoverAndSetInitialSelection = async () => {
      // Get current known PRs from store
      let currentKnownIds = Array.from(
        useAnalysisStore.getState().allAnalyzedPRIds
      );

      // If we already have some analyzed PRs in the store, don't check cache again
      if (currentKnownIds.length > 0) {
        console.log(
          `[useInitialPRDiscovery] Already have ${currentKnownIds.length} PRs in store, skipping cache check`
        );
        setSelectedPRIds(currentKnownIds);
        return;
      }

      // Determine PRs to check in cache (those not already known)
      const effectivePRsToCheck = useAllPRs && allPRs ? allPRs : pullRequests;
      const prIdsToCheckInCache = effectivePRsToCheck
        .map((pr) => pr.id)
        .filter((id) => !currentKnownIds.includes(id));

      // Skip if no PRs to check
      if (prIdsToCheckInCache.length === 0) {
        console.log("[useInitialPRDiscovery] No new PRs to check in cache.");
        return;
      }

      // Only check a reasonable batch size to avoid excessive DB operations
      const MAX_BATCH_SIZE = 15;
      const batchToCheck = prIdsToCheckInCache.slice(0, MAX_BATCH_SIZE);

      console.log(
        `[useInitialPRDiscovery] Checking cache for ${batchToCheck.length} PRs (out of ${prIdsToCheckInCache.length} total)`
      );

      try {
        const cacheResults = await Promise.all(
          batchToCheck.map((id) => cacheService.getPRAnalysis(id, developerId))
        );

        const newlyFoundCachedIds = cacheResults
          .filter((result) => result !== null)
          .map((result) => result!.prId);

        if (newlyFoundCachedIds.length > 0) {
          console.log(
            `[useInitialPRDiscovery] Found ${newlyFoundCachedIds.length} analyzed PRs in cache`
          );

          // Add to store and update local list
          addAnalyzedPRIds(newlyFoundCachedIds);
          currentKnownIds = [...currentKnownIds, ...newlyFoundCachedIds];

          // Set as initially selected PRs
          setSelectedPRIds(currentKnownIds);
        } else {
          console.log("[useInitialPRDiscovery] No analyzed PRs found in cache");
          setSelectedPRIds([]);
        }
      } catch (error) {
        console.error(
          "[useInitialPRDiscovery] Error checking cache for PRs:",
          error
        );
        // Set empty selection on error
        setSelectedPRIds([]);
      }
    };

    discoverAndSetInitialSelection();
  }, [
    developerId, // Only re-run when developer changes
    pullRequests,
    allPRs,
    useAllPRs,
    addAnalyzedPRIds,
    setSelectedPRIds,
  ]);
}
