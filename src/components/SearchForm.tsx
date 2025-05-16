import { useState, useEffect } from "react";
import { TimeframeSelector, Timeframe } from "./TimeframeSelector";
import { motion } from "framer-motion";

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

  // Update form when initialUsername changes (from URL)
  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  // Handle form submission - the only place where search is triggered
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username.trim().length > 2) {
      console.log(
        `[SearchForm] Form submitted for user: ${username} with timeframe: ${timeframe}`
      );
      onSearch(username, timeframe);
    }
  };

  // Handle timeframe changes without triggering search
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    console.log(
      `[SearchForm] Timeframe changed to: ${newTimeframe} (search not triggered)`
    );
    setTimeframe(newTimeframe);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-gray-100 overflow-hidden bg-white mb-8 shadow-sm"
    >
      <div className="flex flex-col md:flex-row">
        {/* Left content area (Form) */}
        <div className="p-4 sm:p-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section Title */}
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-semibold text-gray-900 text-left mb-4"
            >
              Developer Analytics
            </motion.h3>

            {/* Timeframe Selector Section */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-5"
            >
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                Select Analysis Timeframe
              </label>
              <TimeframeSelector
                selectedTimeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
              />
            </motion.div>

            {/* Combined Input and Button Row */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-end gap-4"
            >
              {/* Username Input */}
              <div className="w-full sm:flex-1">
                <label
                  htmlFor="github-username"
                  className="block text-sm font-medium text-gray-700 mb-2 text-left"
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
                  className="px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg w-full text-sm shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="w-full sm:w-auto flex-shrink-0 mt-3 sm:mt-0">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-purple-600 text-white py-2.5 px-6 rounded-lg hover:bg-purple-700 transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center"
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
                </motion.button>
              </div>
            </motion.div>
          </form>
        </div>

        {/* Right decorative area */}
        <div className="hidden md:block md:w-1/3 bg-gray-50 p-6 relative">
          {/* Gradient background effect */}
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-purple-100 to-indigo-50"></div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-center items-center text-center">
            <svg
              className="w-16 h-16 text-purple-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <h4 className="text-gray-800 font-medium mb-2">PR Analysis</h4>
            <p className="text-gray-600 text-sm">
              Enter a GitHub username and select a timeframe to analyze their
              pull request activity.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
