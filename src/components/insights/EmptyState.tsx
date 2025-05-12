import React from "react"

interface EmptyStateProps {
  handleAnalyze: () => void;
  maxPRs: number;
  hasApiKey: boolean;
  setIsConfigVisible: (visible: boolean) => void;
}

/**
 * EmptyState component displayed when no PRs have been analyzed yet
 */
export function EmptyState({
  handleAnalyze,
  maxPRs,
  hasApiKey,
  setIsConfigVisible
}: EmptyStateProps) {
  return (
    <div className="bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/10 dark:to-zinc-800/30 rounded-lg p-4 text-left">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 mr-3 flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-purple-600 dark:text-purple-400"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
          No PR Analysis Yet
        </h3>
      </div>
      
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
        Analyze PRs to get insights about your code quality.
      </p>
      
      {/* How many PRs selector */}
      <div className="flex items-center mb-3 text-left">
        <p className="mr-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          How many PRs to analyze?
        </p>
        <select
          className="px-2 py-1 text-xs rounded-md bg-white/70 dark:bg-zinc-800/50 backdrop-blur-sm"
          value={maxPRs}
          disabled
        >
          <option value={5}>5 PRs</option>
          <option value={10}>10 PRs</option>
          <option value={15}>15 PRs</option>
        </select>
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!hasApiKey}
        className={`w-full mb-3 px-3 py-2 rounded-md transition-colors text-xs font-medium flex items-center justify-center ${
          hasApiKey
            ? "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 shadow-sm"
            : "bg-zinc-300 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 cursor-not-allowed"
        }`}
      >
        <svg
          className="w-3.5 h-3.5 mr-1.5"
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
        Analyze last {maxPRs} PRs
      </button>
      
      {/* API key message */}
      {!hasApiKey && (
        <div className="mb-3 text-xs text-red-500 dark:text-red-400">
          <p className="mb-1">An API key is required for analysis.</p>
          <button
            onClick={() => setIsConfigVisible(true)}
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            Configure your API key
          </button>
        </div>
      )}
      
      <div className="bg-white/50 dark:bg-zinc-800/30 backdrop-blur-sm rounded-md p-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="font-medium mb-1">Alternatively:</div>
        <ol className="space-y-0.5 pl-4 list-decimal">
          <li>Find a PR in the Timeline</li>
          <li>Click "Analyze"</li>
          <li>Results will appear in the PR</li>
        </ol>
      </div>
    </div>
  )
}

export default EmptyState