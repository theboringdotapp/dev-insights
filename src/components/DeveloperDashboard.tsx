import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useDeveloperPerformance } from "../lib/useGitHubService";
import { SearchForm } from "./SearchForm";
import { StatsDisplay } from "./StatsDisplay";
import { PullRequestList } from "./PullRequestList";
import { Timeframe } from "./TimeframeSelector";
import { Timeline } from "./Timeline";
import { PullRequestItem } from "../lib/types";

export default function DeveloperDashboard() {
  const { isAuthenticated, userProfile } = useAuth();
  const [username, setUsername] = useState(userProfile?.login || "");
  const [timeframe, setTimeframe] = useState<Timeframe>("1month");
  const [showData, setShowData] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState<number | undefined>(
    undefined
  );

  // Only fetch data when the search trigger changes
  const developerData = useDeveloperPerformance(
    username,
    undefined, // org is no longer used
    undefined, // repo is no longer used
    timeframe,
    searchTrigger
  );

  const handleSearch = (newUsername: string, newTimeframe: Timeframe) => {
    setUsername(newUsername);
    setTimeframe(newTimeframe);
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

  const timeframeLabel = getTimeframeLabel(timeframe);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">
        Developer Performance Dashboard
      </h2>

      <SearchForm
        username={username}
        initialTimeframe={timeframe}
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
          {/* Current timeframe indicator */}
          <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
            Showing data for:{" "}
            <span className="font-medium">{timeframeLabel}</span>
          </div>

          {/* Stats Summary */}
          {developerData.stats && <StatsDisplay stats={developerData.stats} />}

          {/* Pull Requests */}
          {developerData.pullRequests.length > 0 && (
            <>
              <PullRequestList
                pullRequests={developerData.pullRequests}
                timeframeLabel={timeframeLabel}
              />

              {/* Timeline View */}
              <Timeline
                pullRequests={developerData.pullRequests as PullRequestItem[]}
                timeframeLabel={timeframeLabel}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function getTimeframeLabel(timeframe: Timeframe): string {
  switch (timeframe) {
    case "1week":
      return "Last Week";
    case "1month":
      return "Last Month";
    case "3months":
      return "Last 3 Months";
    case "6months":
      return "Last 6 Months";
    case "1year":
      return "Last Year";
    default:
      return "Timeline";
  }
}
