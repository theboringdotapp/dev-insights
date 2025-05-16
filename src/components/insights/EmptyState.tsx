import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmptyStateProps {
  handleAnalyze: () => void;
  maxPRs: number;
  hasApiKey: boolean;
  setIsConfigVisible: (visible: boolean) => void;
  handleMaxPRsChange: (value: number) => void;
}

/**
 * EmptyState component displayed when no PRs have been analyzed yet.
 * More direct and focused on developer learning.
 */
export function EmptyState({
  handleAnalyze,
  maxPRs,
  hasApiKey,
  setIsConfigVisible,
  handleMaxPRsChange,
}: EmptyStateProps) {
  return (
    <div className="group relative overflow-hidden p-6 bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-100 dark:from-purple-800/30 dark:via-indigo-900/30 dark:to-purple-800/40 rounded-xl shadow-lg text-left animate-subtle-gradient">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none opacity-30 group-hover:opacity-60"></div>
      <div className="relative z-10">
        {/* Header - Icon removed */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-1">
            Analyze Your PRs for Growth
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Get AI-driven feedback to understand your code, identify
            improvements, and discover learning opportunities.
          </p>
        </div>

        <ul className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300 mb-5 list-none pl-0">
          {[
            "Discover your coding strengths",
            "Identify areas for code refinement",
            "Explore relevant learning pathways for career growth",
            "Receive actionable suggestions for better code quality",
          ].map((item, index) => (
            <li key={index} className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 text-green-500 dark:text-green-400 mr-2 shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        {/* Controls Section */}
        <div className="border-t border-purple-200 dark:border-purple-700/30 pt-5 mt-5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 mb-3">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Analyze your latest
            </p>
            <div className="flex items-baseline gap-x-1.5">
              <Select
                value={maxPRs.toString()}
                onValueChange={(value) => handleMaxPRsChange(Number(value))}
              >
                <SelectTrigger
                  className="h-auto w-auto px-1.5 py-0.5 text-sm font-medium text-purple-600 dark:text-purple-400 
                             bg-transparent dark:bg-transparent 
                             border-0 border-b-2 border-purple-300 dark:border-purple-600 
                             hover:border-purple-500 dark:hover:border-purple-400
                             focus:ring-0 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400
                             rounded-none shadow-none align-baseline"
                >
                  <SelectValue placeholder="Select PRs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 PRs</SelectItem>
                  <SelectItem value="5">5 PRs</SelectItem>
                  <SelectItem value="10">10 PRs</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                to get started:
              </p>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!hasApiKey}
            className={`w-full px-4 py-2 rounded-md transition-colors text-xs font-medium flex items-center justify-center ${
              hasApiKey
                ? "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 shadow-md hover:shadow-lg focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                : "bg-zinc-300 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 cursor-not-allowed"
            }`}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              ></path>
            </svg>
            {`Analyze ${maxPRs} PRs`}
          </button>

          {!hasApiKey && (
            <div className="mb-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-md text-xs text-red-600 dark:text-red-400">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 mr-2 shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  An API key is required for analysis.
                  <button
                    onClick={() => setIsConfigVisible(true)}
                    className="font-medium text-purple-600 dark:text-purple-400 hover:underline ml-1"
                  >
                    Configure API Key
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/30 dark:bg-zinc-800/20 backdrop-blur-sm rounded-md p-4 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50">
            <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Alternatively, analyze individual PRs:
            </p>
            <ol className="space-y-1 list-decimal list-inside pl-1">
              <li>Find a Pull Request in the main Timeline view.</li>
              <li>Click the "Analyze" button next to that PR.</li>
              <li>
                Review the AI-generated insights directly on the PR details.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmptyState;
