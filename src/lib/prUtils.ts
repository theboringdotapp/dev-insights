import { PullRequestItem } from "./types";

// Define the important PR types based on conventional commits
const IMPORTANT_PR_TYPES = [
  "feat", // New features
  "fix", // Bug fixes
  "perf", // Performance improvements
  "refactor", // Code refactoring
  "security", // Security fixes
];

/**
 * Checks if a pull request is important based on conventional commit naming
 * Important PRs are those that start with conventional commit prefixes like feat:, fix:, etc.
 */
export function isImportantPR(pr: PullRequestItem): boolean {
  const title = pr.title.toLowerCase().trim();

  // Check against all important types with colon format (type: description)
  for (const type of IMPORTANT_PR_TYPES) {
    if (title.startsWith(`${type}:`)) {
      return true;
    }
  }

  // Check against all important types with parenthesis format (type(scope): description)
  for (const type of IMPORTANT_PR_TYPES) {
    if (title.startsWith(`${type}(`)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters pull requests based on importance
 * @param pullRequests The list of pull requests to filter
 * @param showOnlyImportant Whether to show only important PRs
 * @returns Filtered list of pull requests
 */
export function filterPullRequests(
  pullRequests: PullRequestItem[],
  showOnlyImportant: boolean
): PullRequestItem[] {
  if (!showOnlyImportant) {
    return pullRequests;
  }

  return pullRequests.filter(isImportantPR);
}

/**
 * Get PR type statistics from a list of pull requests
 * Returns an object with counts for each PR type
 */
export function getPRTypeStats(
  pullRequests: PullRequestItem[]
): Record<string, number> {
  const stats: Record<string, number> = {};

  pullRequests.forEach((pr) => {
    const title = pr.title.toLowerCase().trim();
    let type = "other"; // Default category

    // Try to extract conventional commit type
    const colonMatch = title.match(/^([a-z]+):/);
    const parenthesisMatch = title.match(/^([a-z]+)\(/);

    if (colonMatch) {
      type = colonMatch[1];
    } else if (parenthesisMatch) {
      type = parenthesisMatch[1];
    }

    stats[type] = (stats[type] || 0) + 1;
  });

  return stats;
}
