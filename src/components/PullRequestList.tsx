import { PullRequestItem } from "../lib/types";

interface PullRequestListProps {
  pullRequests: unknown[];
  timeframeLabel?: string;
}

export function PullRequestList({
  pullRequests,
  timeframeLabel = "Recent",
}: PullRequestListProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-3">
        {timeframeLabel} Pull Requests
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
            {(pullRequests as PullRequestItem[]).slice(0, 5).map((pr) => (
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
  );
}
