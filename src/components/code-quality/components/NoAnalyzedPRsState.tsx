import React from "react";

interface NoAnalyzedPRsStateProps {
  handleAnalyze: () => void;
  maxPRs: number;
  hasApiKey: boolean;
  setIsConfigVisible: (visible: boolean) => void;
}

/**
 * Component to display when no PRs have been analyzed
 * Redesigned to be more visually appealing and action-oriented
 */
export default function NoAnalyzedPRsState({
  handleAnalyze,
  maxPRs,
  hasApiKey,
  setIsConfigVisible,
}: NoAnalyzedPRsStateProps) {
  // Simplified button text
  const buttonText = `Analyze last ${maxPRs} PRs`;

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="flex flex-col md:flex-row">
        {/* Left content area */}
        <div className="p-8 flex-1">
          <h3 className="text-xl font-bold text-foreground mb-3">
            Review PRs with AI-Powered Analysis
          </h3>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            Gain valuable insights into code quality, identify patterns, and
            discover opportunities for improvement in your pull requests. Our AI
            agent analyzes code to help you make informed decisions.
          </p>

          <p className="mb-6 text-sm text-muted-foreground italic border-l-2 border-primary/50 pl-3">
            You can also select individual PRs for analysis from the Timeline
            below. Once analyzed, they'll appear in the PR selection panel.
          </p>

          {/* PR Count Selector with improved styling */}
          <div className="flex items-center mb-6">
            <p className="mr-3 text-sm font-medium text-foreground">
              How many PRs to analyze?
            </p>
            <select
              className="px-3 py-2 border border-input rounded-md text-sm bg-card shadow-sm focus:ring-ring focus:border-primary"
              value={maxPRs}
              disabled
            >
              <option value="3">3 PRs</option>
              <option value="5">5 PRs</option>
              <option value="10">10 PRs</option>
              <option value="15">15 PRs</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleAnalyze}
              disabled={!hasApiKey}
              className={`px-6 py-3 rounded-md transition-colors text-sm font-medium shadow-sm hover:shadow-md flex items-center ${
                hasApiKey
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
              {buttonText}
            </button>
            {!hasApiKey && (
              <div className="mt-4">
                <p className="text-sm text-red-600 mb-2">
                  An API key is required to analyze pull requests.
                </p>
                <button
                  onClick={() => setIsConfigVisible(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Click here to configure your API key.
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right decorative area */}
        <div className="hidden md:block w-1/3 bg-primary p-6 relative">
          <div className="absolute inset-0 opacity-20">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="relative z-10 h-full flex flex-col justify-center">
            <svg
              className="w-16 h-16 text-primary-foreground opacity-80 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              ></path>
            </svg>
            <h4 className="text-primary-foreground text-lg font-medium mb-2">
              AI-Powered Insights
            </h4>
            <ul className="text-primary-foreground opacity-80 text-sm space-y-2">
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Code quality assessment
              </li>
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Pattern recognition
              </li>
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Best practice suggestions
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
