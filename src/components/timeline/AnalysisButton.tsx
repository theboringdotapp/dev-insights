
import { PullRequestItem } from "../../lib/types";

// Updated AI Icon SVG
const AIIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    fill="none"
    viewBox="0 0 16 16"
    className="inline-block text-purple-600 dark:text-purple-400"
  >
    <path
      stroke="currentColor"
      strokeWidth={1.5}
      d="M2.5 6V1.5H11L13.5 4v10.5H10"
    />
    <path
      stroke="currentColor"
      strokeWidth={1.5}
      d="M10.5 1.5v3h3M1.5 15v-4.5l2-2h2V15M7.5 8v7M1.5 12.5h4"
    />
  </svg>
);

interface AnalysisButtonProps {
  pr: PullRequestItem;
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: (pr: PullRequestItem) => Promise<void>;
  onReanalyze: (pr: PullRequestItem) => Promise<void>;
}

export default function AnalysisButton({
  pr,
  isAnalyzed,
  isAnalyzing,
  onAnalyze,
  onReanalyze,
}: AnalysisButtonProps) {
  if (isAnalyzing) {
    return (
      <div className="text-xs border border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 py-0.5 px-2.5 rounded-full inline-flex items-center">
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-purple-600 dark:text-purple-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Analyzing...
      </div>
    );
  }

  if (isAnalyzed) {
    return (
      <div className="flex items-center">
        <span className="text-xs border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 py-0.5 px-2.5 rounded-full inline-flex items-center">
          Analyzed
        </span>
        <button
          onClick={() => onReanalyze(pr)}
          title="Re-analyze PR"
          className="ml-1.5 p-0.5 rounded-full text-purple-400 dark:text-purple-500 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50/60 dark:hover:bg-purple-900/10 transition-colors cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onAnalyze(pr)}
      className="text-xs border border-purple-200 dark:border-purple-700/50 bg-white dark:bg-zinc-800/50 text-purple-600 dark:text-purple-400 hover:bg-purple-50/60 dark:hover:bg-purple-900/10 py-0.5 px-2.5 rounded-full inline-flex items-center transition-colors cursor-pointer"
    >
      <span className="mr-1.5">
        <AIIcon />
      </span>
      Analyze
    </button>
  );
}
