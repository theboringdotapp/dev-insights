import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Timeframe } from "./TimeframeSelector";

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

  // Update form when initialTimeframe changes (from parent component)
  useEffect(() => {
    setTimeframe(initialTimeframe);
  }, [initialTimeframe]);

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
    <div className="bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 rounded-2xl p-6 mb-8">
      <div className="max-w-4xl ">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 bg-clip-text text-transparent">
              Developer Analytics
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Analyze GitHub pull request activity and code quality insights
            </p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-sm p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Controls Row */}
              <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6">
                {/* Username Input Section */}
                <div className="flex-1">
                  <label
                    htmlFor="github-username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    GitHub Username
                  </label>
                  <div className="relative">
                    <input
                      id="github-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., octocat"
                      required
                      className="w-full bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Timeframe Selector */}
                <div className="w-full lg:w-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Analysis Timeframe
                  </label>
                  <select
                    value={timeframe}
                    onChange={(e) =>
                      handleTimeframeChange(e.target.value as Timeframe)
                    }
                    className="w-full lg:w-auto bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all"
                  >
                    <option value="1month">Past Month</option>
                    <option value="3months">Past 3 Months</option>
                    <option value="6months">Past 6 Months</option>
                    <option value="1year">Past Year</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="w-full lg:w-auto">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none transition-all flex items-center justify-center"
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
                      <>
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
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        Analyze Developer
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Help Text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-purple-50/50 border border-purple-100/50 rounded-xl p-4"
              >
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-purple-700">
                    <p className="font-medium mb-1">How it works:</p>
                    <p className="text-purple-600">
                      Enter any GitHub username to analyze their pull request
                      activity, code quality patterns, and productivity metrics.
                      The analysis focuses on public repositories and pull
                      requests within your selected timeframe.
                    </p>
                  </div>
                </div>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
