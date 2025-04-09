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
  const [debouncedUsername, setDebouncedUsername] = useState(initialUsername);

  // Update form when initialUsername changes (from URL)
  useEffect(() => {
    setUsername(initialUsername);
    setDebouncedUsername(initialUsername);
  }, [initialUsername]);

  // Debounce the username input to avoid excessive URL updates and API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username !== debouncedUsername) {
        setDebouncedUsername(username);

        if (username.trim().length > 2) {
          // Update URL but don't trigger full search yet
          setSearchParams({ username: username });
        }
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timer);
  }, [username, debouncedUsername, setSearchParams]);

  // Handle form submission (still needed for explicit search)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(username, timeframe);
  };

  // Listen for timeframe changes to trigger search
  const handleTimeframeChange = useCallback(
    (newTimeframe: Timeframe) => {
      setTimeframe(newTimeframe);

      // Only trigger search if we have a valid username
      if (username.trim().length > 2) {
        onSearch(username, newTimeframe);
      }
    },
    [username, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="mb-8 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        <div className="col-span-1 md:col-span-2">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-foreground text-left">
              GitHub Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., octocat"
              required
              className="px-4 py-2 border border-input bg-background rounded-md w-full focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        <div className="col-span-1">
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
            disabled={isLoading || username.trim().length < 3}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Loading...
              </span>
            ) : (
              "Analyze Developer"
            )}
          </button>
        </div>
      </div>

      <TimeframeSelector
        selectedTimeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
      />
    </form>
  );
}
