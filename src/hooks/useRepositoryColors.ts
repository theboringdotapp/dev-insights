import { useMemo } from "react";
import { PullRequestItem } from "../lib/types";

export function useRepositoryColors(pullRequests: PullRequestItem[]) {
  // Extract unique repositories and assign colors
  return useMemo(() => {
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
}

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
