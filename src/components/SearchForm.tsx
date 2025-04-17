import { useState, useEffect, useCallback } from "react";
import { TimeframeSelector, Timeframe } from "./TimeframeSelector";
import { useSearchParams } from "react-router-dom";

interface SearchFormProps {
  username: string;
  onSearch: (username: string, timeframe: Timeframe) => void;
  isLoading: boolean;
  initialTimeframe?: Timeframe;
}

export function SearchForm({
  username: initialUsername,
  onSearch,
  isLoading,
  initialTimeframe = "1month",
}: SearchFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [, setSearchParams] = useSearchParams();

  // Update form when initialUsername changes (from URL)
  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  // Handle form submission (still needed for explicit search)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL only on explicit submission
    setSearchParams({ username: username });
    onSearch(username, timeframe);
  };

  // Listen for timeframe changes to trigger search
  const handleTimeframeChange = useCallback(
    (newTimeframe: Timeframe) => {
      setTimeframe(newTimeframe);

      // Only trigger search if we have a valid username
      if (username.trim().length > 2) {
        // Update URL when timeframe changes *if* username is valid
        setSearchParams({ username: username });
        onSearch(username, newTimeframe);
      }
    },
    [username, onSearch, setSearchParams]
  );

  return (
    // Outer container with border and background, similar to NoAnalyzedPRsState
    <div className="rounded-lg border border-border overflow-hidden bg-card mb-8">
      <div className="flex flex-col md:flex-row">
        {/* Left content area (Form) - Changed padding to be responsive */}
        <div className="p-4 sm:p-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Timeframe Selector Section - Moved to the top */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-foreground mb-1.5 text-left">
                Select Analysis Timeframe
              </label>
              <TimeframeSelector
                selectedTimeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
              />
            </div>

            {/* Combined Input and Button Row */}
            <div className="flex flex-col sm:flex-row items-end gap-3">
              {/* Username Input */}
              <div className="w-full sm:flex-1">
                <label
                  htmlFor="github-username"
                  className="block text-sm font-medium text-foreground mb-1.5 text-left"
                >
                  GitHub Username
                </label>
                <input
                  id="github-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., octocat"
                  required
                  className="px-3 py-2 border border-input bg-background rounded-md w-full text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-primary transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="w-full sm:w-auto flex-shrink-0">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-primary text-primary-foreground py-2 px-5 rounded-md hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center"
                  disabled={isLoading || username.trim().length < 3}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                    </>
                  ) : (
                    "Analyze Developer"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right decorative area (Placeholder) */}
        <div className="hidden md:block md:w-1/3 bg-muted/40 p-6 relative">
          {/* Placeholder for image/SVG */}
          <div className="relative z-10 h-full flex flex-col justify-center items-center text-center">
            {/* TODO: Add relevant SVG or Illustration */}
            <svg
              className="w-16 h-16 text-muted-foreground opacity-50 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <h4 className="text-foreground font-medium mb-2">
              Developer Analysis
            </h4>
            <p className="text-muted-foreground text-sm">
              Enter a GitHub username and select a timeframe to analyze their
              activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
