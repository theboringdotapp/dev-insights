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
   * Handles pagination to fetch all PRs when maxItems > perPage
   */
  async getUserPullRequests({
    org,
    repo,
    username,
    perPage = 50, // Increased from 30 for efficiency
    page = 1,
    since,
    maxItems = 150,
  }: {
    org?: string;
    repo?: string;
    username: string;
    perPage?: number;
    page?: number;
    since?: string; // ISO 8601 date format
    maxItems?: number; // Maximum number of items to retrieve across all pages
  }) {
    try {
      // Search for PRs authored by the user
      const query = `author:${username} type:pr${org ? ` org:${org}` : ""}${
        repo ? ` repo:${org}/${repo}` : ""
      }${since ? ` created:>=${since}` : ""}`;

      // Fetch first page
      const firstResponse =
        await this.octokit.rest.search.issuesAndPullRequests({
          q: query,
          per_page: perPage,
          page,
          sort: "created",
          order: "desc",
        });

      let allItems = [...firstResponse.data.items];
      const totalCount = Math.min(firstResponse.data.total_count, maxItems);

      // If we have more items and haven't reached maxItems, fetch additional pages
      if (totalCount > perPage && allItems.length < maxItems) {
        // Calculate how many pages we should fetch (but limit to avoid excessive requests)
        const totalPages = Math.min(
          Math.ceil(totalCount / perPage),
          Math.ceil(maxItems / perPage),
          10 // Maximum 10 pages to avoid rate limiting issues
        );

        // Prepare all requests at once for better performance
        const additionalRequests = [];

        // Start from page 2 since we already have page 1
        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
          if ((currentPage - 1) * perPage >= maxItems) break;

          additionalRequests.push(
            this.octokit.rest.search.issuesAndPullRequests({
              q: query,
              per_page: perPage,
              page: currentPage,
              sort: "created",
              order: "desc",
            })
          );
        }

        // Execute all requests in parallel
        if (additionalRequests.length > 0) {
          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));

          const additionalResponses = await Promise.all(additionalRequests);

          // Merge all responses
          for (const response of additionalResponses) {
            allItems = [...allItems, ...response.data.items];
          }

          // Trim to maxItems if needed
          if (allItems.length > maxItems) {
            allItems = allItems.slice(0, maxItems);
          }
        }
      }

      return allItems;
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
      const [pullRequest, reviews, comments, commits] = await Promise.all([
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
        this.octokit.rest.pulls.listReviewComments({
          owner,
          repo,
          pull_number: pullNumber,
          per_page: 100, // Fetch up to 100 review comments
        }),
        this.octokit.rest.pulls.listCommits({
          owner,
          repo,
          pull_number: pullNumber,
          per_page: 30, // Fetch up to 30 commits
        }),
      ]);

      return {
        pullRequest: pullRequest.data,
        reviews: reviews.data,
        comments: comments.data,
        commits: commits.data,
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
   * Fetches code changes (files and diffs) for a specific pull request
   */
  async getPullRequestFiles({
    owner,
    repo,
    pullNumber,
  }: {
    owner: string;
    repo: string;
    pullNumber: number;
  }) {
    try {
      const response = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100, // Fetch up to 100 files
      });

      return response.data;
    } catch (error) {
      const octokitError = error as OctokitError;
      throw new GitHubServiceError(
        `Failed to fetch pull request files: ${octokitError.message}`,
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

      const reviewQuery = `reviewed-by:${username} type:pr${
        org ? ` org:${org}` : ""
      }${repo ? ` repo:${org}/${repo}` : ""}${
        since ? ` updated:>=${since}` : ""
      }`;

      // We'll calculate commit count from PRs
      // Run queries in parallel
      const [prs, reviews] = await Promise.all([
        this.octokit.rest.search.issuesAndPullRequests({ q: prQuery }),
        this.octokit.rest.search.issuesAndPullRequests({ q: reviewQuery }),
      ]);

      // Estimate commit count based on PRs - real commit data would require
      // individual repo API calls which could hit rate limits
      const estimatedCommitCount = Math.round(prs.data.total_count * 2.5);

      return {
        pullRequestCount: prs.data.total_count,
        commitCount: estimatedCommitCount,
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

  /**
   * Get detailed review metrics for PRs reviewed by a user
   * Returns information about approvals and change requests
   */
  async getUserReviewMetrics({
    username,
    org,
    repo,
    since,
    maxItems = 100,
  }: {
    username: string;
    org?: string;
    repo?: string;
    since?: string;
    maxItems?: number;
  }) {
    try {
      // First, get PRs reviewed by the user
      const reviewQuery = `reviewed-by:${username} type:pr${
        org ? ` org:${org}` : ""
      }${repo ? ` repo:${org}/${repo}` : ""}${
        since ? ` updated:>=${since}` : ""
      }`;

      console.log(`[GitHubDevService] Fetching review metrics for user: ${username}`);
      
      const searchResponse = await this.octokit.rest.search.issuesAndPullRequests({
        q: reviewQuery,
        per_page: Math.min(maxItems, 100),
        sort: "updated",
        order: "desc",
      });

      console.log(`[GitHubDevService] Found ${searchResponse.data.items.length} PRs reviewed by ${username}`);

      // For each PR, get the user's reviews
      const reviewMetrics = await Promise.all(
        searchResponse.data.items.map(async (pr) => {
          try {
            // Extract repo info from PR URL
            const urlParts = pr.repository_url.split('/');
            const owner = urlParts[urlParts.length - 2];
            const repoName = urlParts[urlParts.length - 1];

            // Get all reviews for this PR
            const reviewsResponse = await this.octokit.rest.pulls.listReviews({
              owner,
              repo: repoName,
              pull_number: pr.number,
            });

            // Filter reviews by the target user
            const userReviews = reviewsResponse.data.filter(
              (review) => review.user?.login === username
            );

            // Find the latest review state
            const latestReview = userReviews.sort(
              (a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime()
            )[0];

            const latestReviewState = latestReview?.state || null;
            const hasApproved = userReviews.some(review => review.state === 'APPROVED');
            const hasRequestedChanges = userReviews.some(review => review.state === 'CHANGES_REQUESTED');

            return {
              prNumber: pr.number,
              prUrl: pr.html_url,
              repository: `${owner}/${repoName}`,
              userReviews: userReviews.map(review => ({
                id: review.id,
                user: {
                  login: review.user?.login || '',
                },
                state: review.state as 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED',
                body: review.body,
                submitted_at: review.submitted_at || '',
                pull_request_url: pr.html_url,
              })),
              latestReviewState: latestReviewState as 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | null,
              totalReviews: userReviews.length,
              hasApproved,
              hasRequestedChanges,
            };
          } catch (error) {
            console.warn(`[GitHubDevService] Failed to fetch reviews for PR #${pr.number}:`, error);
            return null;
          }
        })
      );

      // Filter out failed requests
      const validMetrics = reviewMetrics.filter(Boolean);

      // Calculate summary statistics
      const stats = {
        totalPRsReviewed: validMetrics.length,
        prsApproved: validMetrics.filter(m => m!.latestReviewState === 'APPROVED').length,
        prsWithChangesRequested: validMetrics.filter(m => m!.hasRequestedChanges).length,
        prsCommentedOnly: validMetrics.filter(m => 
          m!.latestReviewState === 'COMMENTED' && 
          !m!.hasApproved && 
          !m!.hasRequestedChanges
        ).length,
        approvalRate: validMetrics.length > 0 
          ? (validMetrics.filter(m => m!.latestReviewState === 'APPROVED').length / validMetrics.length) * 100 
          : 0,
        changeRequestRate: validMetrics.length > 0 
          ? (validMetrics.filter(m => m!.hasRequestedChanges).length / validMetrics.length) * 100 
          : 0,
      };

      console.log(`[GitHubDevService] Review metrics calculated:`, stats);

      return {
        reviewMetrics: validMetrics,
        reviewStats: stats,
      };
    } catch (error) {
      const octokitError = error as OctokitError;
      console.error(`[GitHubDevService] Failed to fetch review metrics:`, octokitError);
      throw new GitHubServiceError(
        `Failed to fetch review metrics: ${octokitError.message}`,
        octokitError.status
      );
    }
  }
}
