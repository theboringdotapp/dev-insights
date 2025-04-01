import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useDeveloperPerformance } from "../lib/useGitHubService";
import { SearchForm } from "./SearchForm";
import { StatsDisplay } from "./StatsDisplay";
import { PullRequestList } from "./PullRequestList";

export default function DeveloperDashboard() {
  const { isAuthenticated, userProfile } = useAuth();
  const [username, setUsername] = useState(userProfile?.login || "");
  const [showData, setShowData] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState<number | undefined>(
    undefined
  );

  // Only fetch data when the search trigger changes
  const developerData = useDeveloperPerformance(
    username,
    undefined, // org is no longer used
    undefined, // repo is no longer used
    searchTrigger
  );

  const handleSearch = (newUsername: string) => {
    setUsername(newUsername);
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

      <SearchForm
        username={username}
        onSearch={handleSearch}
        isLoading={developerData.isLoading}
      />

      {developerData.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {developerData.error}
        </div>
      )}

      {showData && !developerData.isLoading && !developerData.error && (
        <div className="space-y-8">
          {/* Stats Summary */}
          {developerData.stats && <StatsDisplay stats={developerData.stats} />}

          {/* Pull Requests */}
          {developerData.pullRequests.length > 0 && (
            <PullRequestList pullRequests={developerData.pullRequests} />
          )}
        </div>
      )}
    </div>
  );
}
