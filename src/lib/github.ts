// Simple utility for making GitHub API requests with authentication

// GitHub API Types
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  updated_at: string;
  created_at: string;
  pushed_at: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
  // Allow additional string-indexed properties with various potential types
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, unknown>;
}

// Base API URL
const GITHUB_API_BASE = "https://api.github.com";

// Function to make authenticated GitHub API requests
export async function fetchGitHub(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
  // Ensure endpoint starts with /
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Merge default headers with provided options
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${GITHUB_API_BASE}${path}`, fetchOptions);

    if (!response.ok) {
      // Create error with API response details
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        `GitHub API error ${response.status}: ${
          errorData.message || response.statusText
        }`
      );
      throw error;
    }

    // Return JSON response for successful requests
    return await response.json();
  } catch (error) {
    console.error("GitHub API request failed:", error);
    throw error;
  }
}

// Example API methods - add more as needed
export const GitHubAPI = {
  // Get authenticated user profile
  getUserProfile: (token: string) => fetchGitHub("/user", token),

  // Get user repositories
  getUserRepos: (
    token: string,
    page = 1,
    perPage = 30
  ): Promise<GitHubRepository[]> =>
    fetchGitHub(`/user/repos?page=${page}&per_page=${perPage}`, token),

  // Get repository details
  getRepo: (
    token: string,
    owner: string,
    repo: string
  ): Promise<GitHubRepository> => fetchGitHub(`/repos/${owner}/${repo}`, token),

  // Get pull requests for a repository
  getPullRequests: (
    token: string,
    owner: string,
    repo: string,
    state = "all"
  ) => fetchGitHub(`/repos/${owner}/${repo}/pulls?state=${state}`, token),

  // Add more API methods as needed for your dashboard
};
