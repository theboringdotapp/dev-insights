import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useDeveloperPerformance } from "../lib/useGitHubService";

// Define an interface for the pull request data structure
interface PullRequestItem {
  id: number;
  html_url: string;
  title: string;
  state: string;
  created_at: string;
}

export default function DeveloperDashboard() {
  const { isAuthenticated, userProfile } = useAuth();
  const [username, setUsername] = useState(userProfile?.login || "");
  const [org, setOrg] = useState("");
  const [repo, setRepo] = useState("");
  const [showData, setShowData] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState<number | undefined>(
    undefined
  );

  // Only fetch data when the search trigger changes
  const developerData = useDeveloperPerformance(
    username,
    org || undefined,
    repo || undefined,
    searchTrigger
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Increment the search trigger to cause a re-fetch
    setSearchTrigger((prev) => (prev === undefined ? 1 : prev + 1));
    setShowData(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 mb-4">
          Please log in with your GitHub token to view developer performance
          metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">
        Developer Performance Dashboard
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., octocat"
            required
            className="px-3 py-2 border border-gray-300 rounded-md w-full"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization (optional)
          </label>
          <input
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="e.g., github"
            className="px-3 py-2 border border-gray-300 rounded-md w-full"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repository (optional)
          </label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="e.g., octokit.js"
            className="px-3 py-2 border border-gray-300 rounded-md w-full"
          />
        </div>

        <div className="col-span-1 flex items-end">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            disabled={developerData.isLoading}
          >
            {developerData.isLoading ? "Loading..." : "Analyze"}
          </button>
        </div>
      </form>

      {developerData.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {developerData.error}
        </div>
      )}

      {showData && !developerData.isLoading && !developerData.error && (
        <div className="space-y-8">
          {/* Stats Summary */}
          {developerData.stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {developerData.stats.pullRequestCount}
                </div>
                <div className="text-sm text-gray-500 mt-1">Pull Requests</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-4xl font-bold text-green-600">
                  {developerData.stats.reviewCount}
                </div>
                <div className="text-sm text-gray-500 mt-1">Code Reviews</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-4xl font-bold text-purple-600">
                  {developerData.stats.issueCount}
                </div>
                <div className="text-sm text-gray-500 mt-1">Issues</div>
              </div>
            </div>
          )}

          {/* Pull Requests */}
          {developerData.pullRequests.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-3">
                Recent Pull Requests
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(
                      developerData.pullRequests as unknown as PullRequestItem[]
                    )
                      .slice(0, 5)
                      .map((pr) => (
                        <tr key={pr.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a
                              href={pr.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {pr.title}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                pr.state === "open"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {pr.state}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(pr.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
