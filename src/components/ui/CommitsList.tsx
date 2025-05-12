import React from "react";
import { CommitItem } from "../../lib/types";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/Collapsible";

interface CommitsListProps {
  commits: CommitItem[];
  isLoaded: boolean;
}

export function CommitsList({ commits, isLoaded }: CommitsListProps) {
  if (!isLoaded || commits.length === 0) {
    return null;
  }

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
    <div className="mt-2 pt-1">
      <Collapsible className="group">
        <CollapsibleTrigger className="flex items-center w-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700/50 cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1.5 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 17.929H6c-.297 0-.578-.132-.769-.36l-2-2.387c-.297-.351-.297-.85 0-1.201l2-2.387c.191-.228.472-.36.769-.36h10.167C17.075 11.234 18 10.31 18 9.167V4.833C18 3.69 17.075 2.766 15.933 2.766H8c-.297 0-.578.132-.769.36l-2 2.387c-.297.351-.297.85 0 1.201l2 2.387c.191.228.472.36.769.36h12c.552 0 1 .449 1 1v4c0 .551-.448 1-1 1H8z"></path>
          </svg>
          <span>
            {commits.length} {commits.length === 1 ? "commit" : "commits"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="ml-auto h-3 w-3 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-1">
          <ul className="space-y-1.5">
            {commits.map((commit) => (
              <li
                key={commit.sha}
                className="hover:bg-zinc-100 dark:hover:bg-zinc-800/70 p-1 rounded transition-colors"
              >
                <a
                  href={commit.html_url || commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5 mt-0.5 mr-2 text-zinc-400 dark:text-zinc-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582A1 1 0 004 6.77V16a1 1 0 001.8.6l3.8-4.737 3.8 4.737a1 1 0 001.8-.6V6.77a1 1 0 00-1.046-.876L10 4.323V3a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="truncate text-xs">
                    {formatCommitMessage(commit.commit.message)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
