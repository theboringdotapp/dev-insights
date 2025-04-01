import React, { useState } from "react";
import { CommitItem } from "../../lib/types";

interface CommitsListProps {
  commits: CommitItem[];
  isLoaded: boolean;
}

export function CommitsList({ commits, isLoaded }: CommitsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isLoaded || commits.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Truncate commit message to first line or 80 chars
  const formatCommitMessage = (message: string): string => {
    // Get first line
    const firstLine = message.split("\n")[0];
    // Truncate if too long
    return firstLine.length > 80
      ? firstLine.substring(0, 77) + "..."
      : firstLine;
  };

  return (
    <div className="mt-2 text-sm">
      <button
        onClick={toggleExpanded}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <svg
          className={`h-4 w-4 mr-1 transition-transform ${
            isExpanded ? "transform rotate-90" : ""
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          {commits.length} {commits.length === 1 ? "commit" : "commits"}
        </span>
      </button>

      {isExpanded && (
        <ul className="mt-2 ml-6 space-y-1 border-l-2 border-gray-200 pl-3">
          {commits.map((commit) => (
            <li key={commit.sha} className="hover:bg-gray-50 p-1 -ml-1 rounded">
              <a
                href={commit.html_url || commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start text-gray-700 hover:text-blue-600"
              >
                <svg
                  className="h-4 w-4 mt-0.5 mr-2 text-gray-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582A1 1 0 004 6.77V16a1 1 0 001.8.6l3.8-4.737 3.8 4.737a1 1 0 001.8-.6V6.77a1 1 0 00-1.046-.876L10 4.323V3a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="truncate">
                  {formatCommitMessage(commit.commit.message)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
