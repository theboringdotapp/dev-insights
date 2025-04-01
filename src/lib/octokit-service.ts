import { Octokit } from "octokit";

// Define types for error handling
type OctokitError = Error & {
  status?: number;
  message: string;
};

// Error class for GitHub service errors
export class GitHubServiceError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "GitHubServiceError";
    this.statusCode = statusCode;
  }
}

// Helper function to create Octokit instance with token
const createOctokit = (token: string) => {
  return new Octokit({ auth: token });
};

// GitHub Developer Performance Service
export class GitHubDevService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = createOctokit(token);
  }

  /**
   * Fetches pull requests created by a specific user
   */
  async getUserPullRequests({
    org,
    repo,
    username,
    perPage = 30,
    page = 1,
    since,
  }: {
    org?: string;
    repo?: string;
    username: string;
    perPage?: number;
    page?: number;
    since?: string; // ISO 8601 date format
  }) {
    try {
      // Search for PRs authored by the user
      const query = `author:${username} type:pr${org ? ` org:${org}` : ""}${
        repo ? ` repo:${org}/${repo}` : ""
      }${since ? ` created:>=${since}` : ""}`;

      const response = await this.octokit.rest.search.issuesAndPullRequests({
        q: query,
        per_page: perPage,
        page,
        sort: "created",
        order: "desc",
      });

      return response.data.items;
    } catch (error) {
      const octokitError = error as OctokitError;
      throw new GitHubServiceError(
        `Failed to fetch user pull requests: ${octokitError.message}`,
        octokitError.status
      );
    }
  }

  /**
   * Fetches commits made by a specific user
   */
  async getUserCommits({
    org,
    repo,
    username,
    since,
    until,
    perPage = 30,
    page = 1,
  }: {
    org: string;
    repo: string;
    username: string;
    since?: string; // ISO 8601 date format
    until?: string; // ISO 8601 date format
    perPage?: number;
    page?: number;
  }) {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner: org,
        repo: repo,
        author: username,
        since,
        until,
        per_page: perPage,
        page,
      });

      return response.data;
    } catch (error) {
      const octokitError = error as OctokitError;
      throw new GitHubServiceError(
        `Failed to fetch user commits: ${octokitError.message}`,
        octokitError.status
      );
    }
  }

  /**
   * Fetches code reviews done by a specific user
   */
  async getUserReviews({
    org,
    repo,
    username,
    perPage = 30,
    page = 1,
    since,
  }: {
    org?: string;
    repo?: string;
    username: string;
    perPage?: number;
    page?: number;
    since?: string; // ISO 8601 date format
  }) {
    try {
      // Search for PRs reviewed by the user
      const query = `reviewed-by:${username} type:pr${
        org ? ` org:${org}` : ""
      }${repo ? ` repo:${org}/${repo}` : ""}${
        since ? ` updated:>=${since}` : ""
      }`;

      const response = await this.octokit.rest.search.issuesAndPullRequests({
        q: query,
        per_page: perPage,
        page,
        sort: "updated",
        order: "desc",
      });

      return response.data.items;
    } catch (error) {
      const octokitError = error as OctokitError;
      throw new GitHubServiceError(
        `Failed to fetch user reviews: ${octokitError.message}`,
        octokitError.status
      );
    }
  }

  /**
   * Fetches details for a specific pull request
   */
  async getPullRequestDetails({
    owner,
    repo,
    pullNumber,
  }: {
    owner: string;
    repo: string;
    pullNumber: number;
  }) {
    try {
      const [pullRequest, reviews] = await Promise.all([
        this.octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: pullNumber,
        }),
        this.octokit.rest.pulls.listReviews({
          owner,
          repo,
          pull_number: pullNumber,
        }),
      ]);

      return {
        pullRequest: pullRequest.data,
        reviews: reviews.data,
      };
    } catch (error) {
      const octokitError = error as OctokitError;
      throw new GitHubServiceError(
        `Failed to fetch pull request details: ${octokitError.message}`,
        octokitError.status
      );
    }
  }

  /**
   * Get a user's contribution stats (commits, issues, PRs)
   */
  async getUserStats({
    username,
    org,
    repo,
    since,
  }: {
    username: string;
    org?: string;
    repo?: string;
    since?: string; // ISO 8601 date format (e.g., '2023-01-01T00:00:00Z')
  }) {
    try {
      // Build queries for different contribution types
      const prQuery = `author:${username} type:pr${org ? ` org:${org}` : ""}${
        repo ? ` repo:${org}/${repo}` : ""
      }${since ? ` created:>=${since}` : ""}`;
      const issueQuery = `author:${username} type:issue${
        org ? ` org:${org}` : ""
      }${repo ? ` repo:${org}/${repo}` : ""}${
        since ? ` created:>=${since}` : ""
      }`;
      const reviewQuery = `reviewed-by:${username} type:pr${
        org ? ` org:${org}` : ""
      }${repo ? ` repo:${org}/${repo}` : ""}${
        since ? ` updated:>=${since}` : ""
      }`;

      // Run queries in parallel
      const [prs, issues, reviews] = await Promise.all([
        this.octokit.rest.search.issuesAndPullRequests({ q: prQuery }),
        this.octokit.rest.search.issuesAndPullRequests({ q: issueQuery }),
        this.octokit.rest.search.issuesAndPullRequests({ q: reviewQuery }),
      ]);

      return {
        pullRequestCount: prs.data.total_count,
        issueCount: issues.data.total_count,
        reviewCount: reviews.data.total_count,
      };
    } catch (error) {
      const octokitError = error as OctokitError;
      throw new GitHubServiceError(
        `Failed to fetch user statistics: ${octokitError.message}`,
        octokitError.status
      );
    }
  }
}
