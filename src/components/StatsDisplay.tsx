import { DeveloperStats } from "../lib/types";

interface StatsDisplayProps {
  stats: DeveloperStats;
}

export function StatsDisplay({ stats }: StatsDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="text-4xl font-bold text-blue-600">
          {stats.pullRequestCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">Pull Requests</div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="text-4xl font-bold text-green-600">
          {stats.reviewCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">Code Reviews</div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="text-4xl font-bold text-purple-600">
          {stats.issueCount}
        </div>
        <div className="text-sm text-gray-500 mt-1">Issues</div>
      </div>
    </div>
  );
}
