import React, { useState, useEffect } from "react";
import { PullRequestItem } from "../lib/types";
import { usePRMetrics } from "../lib/usePRMetrics";
import { AIAnalysisConfig } from "../lib/aiAnalysisService";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";

interface CodeQualityInsightsProps {
  pullRequests: PullRequestItem[];
  allPRs?: PullRequestItem[];
  showOnlyImportantPRs?: boolean;
  onToggleFilter?: (showOnlyImportant: boolean) => void;
}

export function CodeQualityInsights({
  pullRequests,
  allPRs,
  showOnlyImportantPRs = true,
  onToggleFilter,
}: CodeQualityInsightsProps) {
  const { analyzeMultiplePRs, isAnalyzing, analysisSummary } = usePRMetrics();
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<"openai" | "anthropic">(
    "openai"
  );
  const [maxPRs, setMaxPRs] = useState(5);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [saveToken, setSaveToken] = useState(true);
  const [useAllPRs, setUseAllPRs] = useState(false);

  // Determine which PRs to analyze
  const prsToAnalyze = useAllPRs && allPRs ? allPRs : pullRequests;

  // Load saved API key when provider changes or on initial load
  useEffect(() => {
    const storageKey =
      apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey("");
    }
  }, [apiProvider]);

  // Handle analyze button click
  const handleAnalyze = () => {
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    // Save API key to local storage if opted in
    if (saveToken) {
      const storageKey =
        apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
      localStorage.setItem(storageKey, apiKey);
    }

    const config: AIAnalysisConfig = {
      apiKey,
      provider: apiProvider,
    };

    analyzeMultiplePRs(prsToAnalyze, config, maxPRs);

    // Update filter if analyzing all PRs and not already showing all
    if (useAllPRs && showOnlyImportantPRs && onToggleFilter) {
      onToggleFilter(false);
    }
  };

  // Handle clearing the saved API key
  const handleResetApiKey = () => {
    const storageKey =
      apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
    localStorage.removeItem(storageKey);
    setApiKey("");
  };

  // Change provider without losing saved token
  const handleProviderChange = (newProvider: "openai" | "anthropic") => {
    // If saveToken is enabled, save the current key before switching
    if (saveToken && apiKey) {
      const currentStorageKey =
        apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
      localStorage.setItem(currentStorageKey, apiKey);
    }

    // Update the provider
    setApiProvider(newProvider);
  };

  // Toggle between filtered PRs and all PRs
  const handleToggleAllPRs = () => {
    setUseAllPRs(!useAllPRs);
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Code Quality Insights</h3>
        <button
          onClick={() => setIsConfigVisible(!isConfigVisible)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isConfigVisible ? "Hide Settings" : "Show Settings"}
        </button>
      </div>

      {/* Configuration panel */}
      {isConfigVisible && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Provider
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="apiProvider"
                  value="openai"
                  checked={apiProvider === "openai"}
                  onChange={() => handleProviderChange("openai")}
                />
                <span className="ml-2">OpenAI</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="apiProvider"
                  value="anthropic"
                  checked={apiProvider === "anthropic"}
                  onChange={() => handleProviderChange("anthropic")}
                />
                <span className="ml-2">Anthropic (Claude)</span>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="flex items-center">
              <input
                type="password"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${
                  apiProvider === "openai" ? "OpenAI" : "Anthropic"
                } API key`}
              />
              {apiKey && (
                <button
                  onClick={handleResetApiKey}
                  className="ml-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
                  title="Clear API key"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id="saveToken"
                checked={saveToken}
                onChange={() => setSaveToken(!saveToken)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="saveToken" className="ml-2 text-xs text-gray-500">
                Save API key in browser for future sessions
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of PRs to analyze
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={maxPRs}
              onChange={(e) => setMaxPRs(Number(e.target.value))}
            >
              <option value="3">3 PRs</option>
              <option value="5">5 PRs</option>
              <option value="10">10 PRs</option>
              <option value="15">15 PRs</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Analyzing more PRs provides better insights but may take longer
              and use more API credits.
            </p>
          </div>

          {/* PR selection option */}
          {allPRs && allPRs.length > pullRequests.length && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PRs to Analyze
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useAllPRs"
                  checked={useAllPRs}
                  onChange={handleToggleAllPRs}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="useAllPRs"
                  className="ml-2 text-sm text-gray-600"
                >
                  Include all PRs ({allPRs.length} total) instead of only{" "}
                  {pullRequests.length}{" "}
                  {showOnlyImportantPRs ? "important" : "filtered"} PRs
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                When enabled, analysis will include all PRs, not just the
                filtered ones. The dashboard will update to show all PRs.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !apiKey}
              className={`px-4 py-2 rounded-md ${
                isAnalyzing || !apiKey
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Code Quality"}
            </button>
          </div>
        </div>
      )}

      {/* Analysis Loading Indicator */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">
            Analyzing PRs for code quality patterns...
          </p>
          <p className="text-sm text-gray-500">
            This may take a minute or two as we run each PR through AI analysis.
          </p>
        </div>
      )}

      {/* Analysis Results */}
      {!isAnalyzing && analysisSummary && (
        <div className="space-y-6">
          {/* Overall Summary */}
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-3 text-lg">
              Career Development Assessment
            </h4>
            <p className="text-gray-800">{analysisSummary.overallSummary}</p>
            <div className="mt-4 flex items-center">
              <div className="text-sm text-gray-600 mr-2 font-medium">
                Quality Score:
              </div>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    analysisSummary.averageScore >= 8
                      ? "bg-green-500"
                      : analysisSummary.averageScore >= 6
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${(analysisSummary.averageScore / 10) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="ml-2 font-medium">
                {analysisSummary.averageScore.toFixed(1)}/10
              </div>
            </div>
          </div>

          {/* Common Strengths */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 text-lg">
              Code Strengths
            </h4>
            <div className="space-y-3">
              {analysisSummary.commonStrengths.map((strength, i) => (
                <div
                  key={i}
                  className="p-4 bg-green-50 border border-green-100 rounded-lg"
                >
                  <div className="flex items-start mb-2">
                    <div className="text-green-600 mr-3 flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 text-base">
                        {strength.text.charAt(0).toUpperCase() +
                          strength.text.slice(1)}
                      </h5>
                    </div>
                  </div>

                  <div className="ml-8">
                    <div className="text-xs text-gray-500">
                      Found in {strength.count} PR
                      {strength.count !== 1 ? "s" : ""}:
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {strength.prUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 bg-white rounded border border-green-200 text-green-700 hover:bg-green-50"
                            title={strength.prTitles[idx]}
                          >
                            #{url.split("/").pop()}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {analysisSummary.commonStrengths.length === 0 && (
                <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">
                  No consistent strengths identified
                </div>
              )}
            </div>
          </div>

          {/* Common Weaknesses */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 text-lg">
              Areas for Improvement
            </h4>
            <div className="space-y-3">
              {analysisSummary.commonWeaknesses.map((weakness, i) => (
                <div
                  key={i}
                  className="p-4 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="flex items-start mb-2">
                    <div className="text-red-600 mr-3 flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 text-base">
                        {weakness.text.charAt(0).toUpperCase() +
                          weakness.text.slice(1)}
                      </h5>
                    </div>
                  </div>

                  <div className="ml-8">
                    <div className="text-xs text-gray-500">
                      Found in {weakness.count} PR
                      {weakness.count !== 1 ? "s" : ""}:
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {weakness.prUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 bg-white rounded border border-red-200 text-red-700 hover:bg-red-50"
                            title={weakness.prTitles[idx]}
                          >
                            #{url.split("/").pop()}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {analysisSummary.commonWeaknesses.length === 0 && (
                <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">
                  No consistent areas for improvement identified
                </div>
              )}
            </div>
          </div>

          {/* Suggested Improvements */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 text-lg">
              Growth Opportunities
            </h4>
            <div className="space-y-3">
              {analysisSummary.commonSuggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="p-4 bg-blue-50 border border-blue-100 rounded-lg"
                >
                  <div className="flex items-start mb-2">
                    <div className="text-blue-600 mr-3 flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-800 text-base">
                        {suggestion.text.charAt(0).toUpperCase() +
                          suggestion.text.slice(1)}
                      </h5>
                    </div>
                  </div>

                  <div className="ml-8">
                    <div className="text-xs text-gray-500">
                      Suggested in {suggestion.count} PR
                      {suggestion.count !== 1 ? "s" : ""}:
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {suggestion.prUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 bg-white rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                            title={suggestion.prTitles[idx]}
                          >
                            #{url.split("/").pop()}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {analysisSummary.commonSuggestions.length === 0 && (
                <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">
                  No consistent growth opportunities identified
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initial State / No Analysis Yet */}
      {!isAnalyzing && !analysisSummary && !isConfigVisible && (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Analyze Code Quality
          </h3>
          <p className="text-gray-500 mb-4">
            Use AI to analyze this developer's code across multiple PRs to
            identify patterns, strengths, and areas for improvement.
          </p>
          <button
            onClick={() => setIsConfigVisible(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}

// Helper functions to generate tailored descriptions for each type of feedback
function getStrengthDescription(strength: string): string {
  const lowercaseStrength = strength.toLowerCase();

  if (
    lowercaseStrength.includes("test") ||
    lowercaseStrength.includes("coverage")
  ) {
    return "Your consistent approach to testing demonstrates professionalism and quality focus. This practice significantly reduces bugs in production and builds confidence in your code among team members.";
  }

  if (
    lowercaseStrength.includes("document") ||
    lowercaseStrength.includes("comment")
  ) {
    return "Clear documentation shows your commitment to code maintainability and team collaboration. This practice helps onboard new team members and ensures your code remains understandable over time.";
  }

  if (
    lowercaseStrength.includes("performance") ||
    lowercaseStrength.includes("optimi")
  ) {
    return "Your attention to performance optimization demonstrates technical depth and user experience focus. This skill is highly valued in more senior roles where system efficiency becomes critical.";
  }

  if (
    lowercaseStrength.includes("refactor") ||
    lowercaseStrength.includes("clean")
  ) {
    return "Your dedication to code quality through refactoring shows engineering maturity and long-term thinking. This practice prevents technical debt and improves the codebase for everyone.";
  }

  if (
    lowercaseStrength.includes("modular") ||
    lowercaseStrength.includes("component") ||
    lowercaseStrength.includes("reusab")
  ) {
    return "Creating modular, reusable components demonstrates architectural thinking and efficiency. This approach accelerates development and ensures consistency across your applications.";
  }

  if (
    lowercaseStrength.includes("error") ||
    lowercaseStrength.includes("exception") ||
    lowercaseStrength.includes("handling")
  ) {
    return "Your thorough error handling shows attention to edge cases and user experience. This practice creates more robust applications and prevents unexpected crashes in production.";
  }

  if (
    lowercaseStrength.includes("security") ||
    lowercaseStrength.includes("validat")
  ) {
    return "Your focus on security and validation protects both users and the business. This critical skill is increasingly important as applications face more sophisticated threats.";
  }

  // Default description for other strengths
  return "This coding practice demonstrates good software engineering principles and contributes to maintainable, reliable code. Consistently applying this strength helps establish you as a more senior developer.";
}

function getWeaknessDescription(weakness: string): string {
  const lowercaseWeakness = weakness.toLowerCase();

  if (
    lowercaseWeakness.includes("test") ||
    lowercaseWeakness.includes("coverage")
  ) {
    return "Improving test coverage will significantly reduce bugs and regressions while demonstrating your commitment to code quality. This skill is essential for progression to more senior roles.";
  }

  if (
    lowercaseWeakness.includes("document") ||
    lowercaseWeakness.includes("comment")
  ) {
    return "Better documentation and comments will make your code more maintainable and show your ability to collaborate effectively with your team. This is a key skill for professional development.";
  }

  if (
    lowercaseWeakness.includes("complex") ||
    lowercaseWeakness.includes("simplif")
  ) {
    return "Reducing code complexity will make your solutions more maintainable and easier to reason about. This skill distinguishes more experienced developers who can find elegant solutions to difficult problems.";
  }

  if (
    lowercaseWeakness.includes("naming") ||
    lowercaseWeakness.includes("variable") ||
    lowercaseWeakness.includes("function")
  ) {
    return "Improving naming conventions makes your code self-documenting and shows attention to detail. Clear, consistent naming is a hallmark of professional code that others enjoy working with.";
  }

  if (
    lowercaseWeakness.includes("error") ||
    lowercaseWeakness.includes("exception") ||
    lowercaseWeakness.includes("handling")
  ) {
    return "More robust error handling will improve application reliability and user experience. This practice demonstrates foresight and thoroughness that are valued in more senior positions.";
  }

  if (
    lowercaseWeakness.includes("duplicate") ||
    lowercaseWeakness.includes("repetit") ||
    lowercaseWeakness.includes("dry")
  ) {
    return "Reducing code duplication through proper abstraction will improve maintainability and reduce bugs. This skill shows your ability to recognize patterns and architect more elegant solutions.";
  }

  if (
    lowercaseWeakness.includes("security") ||
    lowercaseWeakness.includes("validat")
  ) {
    return "Addressing security and validation concerns will protect your users and the business from vulnerabilities. This area is increasingly important and demonstrates professional responsibility.";
  }

  // Default description for other weaknesses
  return "Addressing this pattern will significantly improve your code quality and readability. This is an opportunity to level up your technical skills and produce more professional code that meets industry standards.";
}

function getGrowthOpportunityDescription(opportunity: string): string {
  const lowercaseOpportunity = opportunity.toLowerCase();

  if (
    lowercaseOpportunity.includes("design pattern") ||
    lowercaseOpportunity.includes("architect")
  ) {
    return "Learning and applying proven design patterns will elevate your code organization and demonstrate architectural thinking. This advanced skill is highly valued in senior developers who need to build scalable systems.";
  }

  if (
    lowercaseOpportunity.includes("test") ||
    lowercaseOpportunity.includes("tdd") ||
    lowercaseOpportunity.includes("coverage")
  ) {
    return "Adopting test-driven development or improving test coverage will strengthen your code quality and confidence. This practice is essential for career advancement and working on mission-critical systems.";
  }

  if (
    lowercaseOpportunity.includes("review") ||
    lowercaseOpportunity.includes("feedback")
  ) {
    return "Engaging more deeply in code reviews will expand your knowledge and improve team collaboration. This skill helps you build influence and mentorship abilities needed for senior roles.";
  }

  if (
    lowercaseOpportunity.includes("refactor") ||
    lowercaseOpportunity.includes("technical debt")
  ) {
    return "Proactively refactoring code and addressing technical debt shows engineering maturity and ownership. This practice improves the codebase for everyone and demonstrates leadership qualities.";
  }

  if (
    lowercaseOpportunity.includes("performance") ||
    lowercaseOpportunity.includes("optimi")
  ) {
    return "Developing expertise in performance optimization will set you apart as you tackle more complex systems. This technical skill becomes increasingly critical at higher levels of software engineering.";
  }

  if (
    lowercaseOpportunity.includes("document") ||
    lowercaseOpportunity.includes("comment")
  ) {
    return "Creating more comprehensive documentation shows your commitment to code maintainability and knowledge sharing. This practice helps your team work more effectively and demonstrates professional communication.";
  }

  if (
    lowercaseOpportunity.includes("security") ||
    lowercaseOpportunity.includes("best practice")
  ) {
    return "Incorporating security best practices and defensive coding techniques protects users and demonstrates professional responsibility. This increasingly critical skill is highly valued as applications face more sophisticated threats.";
  }

  // Default description for other opportunities
  return "Implementing this suggestion will enhance your development skills and make your code more efficient and maintainable. This represents a specific growth opportunity that will help you advance in your career.";
}
