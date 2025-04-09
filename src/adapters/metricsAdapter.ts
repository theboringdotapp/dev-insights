import { PRMetrics } from "../lib/types/metrics";

// This adapter helps convert between existing metrics types and our new PRMetrics type
export function adaptToPRMetrics(
  existingMetrics: Record<string, unknown>
): PRMetrics | null {
  if (!existingMetrics) return null;

  // Create a basic PRMetrics object
  const prMetrics: PRMetrics = {
    prId: (existingMetrics.prId as number) || 0,
    isLoaded: (existingMetrics.isLoaded as boolean) || false,
    isLoading: (existingMetrics.isLoading as boolean) || false,
  };

  // Copy properties if they exist
  if (existingMetrics.additions !== undefined)
    prMetrics.additions = existingMetrics.additions as number;
  if (existingMetrics.deletions !== undefined)
    prMetrics.deletions = existingMetrics.deletions as number;
  if (existingMetrics.changedFiles !== undefined)
    prMetrics.changedFiles = existingMetrics.changedFiles as number;
  if (existingMetrics.commitCount !== undefined)
    prMetrics.commitCount = existingMetrics.commitCount as number;
  if (existingMetrics.durationInDays !== undefined)
    prMetrics.durationInDays = existingMetrics.durationInDays as number;
  if (existingMetrics.commentCount !== undefined)
    prMetrics.commentCount = existingMetrics.commentCount as number;
  if (existingMetrics.changeRequestCount !== undefined)
    prMetrics.changeRequestCount = existingMetrics.changeRequestCount as number;
  if (existingMetrics.error) prMetrics.error = existingMetrics.error as string;

  // Adapt commits array if it exists
  if (existingMetrics.commits && Array.isArray(existingMetrics.commits)) {
    prMetrics.commits = existingMetrics.commits.map(
      (commit: Record<string, unknown>) => {
        const commitObj = (commit.commit as Record<string, unknown>) || {};
        const authorObj = (commitObj.author as Record<string, unknown>) || {};

        return {
          sha: (commit.sha as string) || (commitObj.oid as string) || "",
          message:
            (commit.message as string) || (commitObj.message as string) || "",
          author: (commit.author as string) || (authorObj.name as string) || "",
          date:
            (commit.date as string) ||
            (commitObj.committedDate as string) ||
            "",
          url: (commit.url as string) || (commitObj.url as string) || "",
          commit: commit.commit, // Keep the original commit object for compatibility
        };
      }
    );
  }

  return prMetrics;
}
