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
