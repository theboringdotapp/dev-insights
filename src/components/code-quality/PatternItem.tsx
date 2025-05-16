import { useState } from "react";
import { RecurringPattern } from "../../lib/types";

// Category icons
const StrengthIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-zinc-600 dark:text-zinc-400"
  >
    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
  </svg>
);

const RefinementIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-zinc-600 dark:text-zinc-400"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const LearningIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-zinc-600 dark:text-zinc-400"
  >
    <path d="M12 2v8" />
    <path d="m4.93 10.93 1.41 1.41" />
    <path d="M2 18h2" />
    <path d="M20 18h2" />
    <path d="m19.07 10.93-1.41 1.41" />
    <path d="M22 22H2" />
    <path d="m8 22 4-10 4 10" />
  </svg>
);

interface PatternItemProps {
  pattern: RecurringPattern;
  index: number;
}

function PatternItem({ pattern, index }: PatternItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to get the appropriate icon based on category
  const getCategoryIcon = () => {
    const category = pattern.category.toLowerCase();
    if (category === "strength") return <StrengthIcon />;
    if (category === "refinement") return <RefinementIcon />;
    if (category === "learning") return <LearningIcon />;
    return null;
  };

  // Helper to get frequency label
  const getFrequencyLabel = () => {
    if (pattern.frequency.toLowerCase().includes("very common"))
      return "trending";
    if (pattern.frequency.toLowerCase().includes("occasional"))
      return "case specific";
    return "common";
  };

  const frequencyLabel = getFrequencyLabel();

  return (
    <li className="flex flex-col">
      <div
        className="flex items-start group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-md p-1 -ml-1 transition-all duration-150 hover:shadow-sm relative"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Index number */}
        <div className="mt-1 mr-2 px-2 py-0.5 text-sm rounded flex-shrink-0 border text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 h-7 w-7 flex items-center justify-center">
          {index + 1}
        </div>

        {/* Icon and pattern details */}
        <div className="flex flex-col text-left flex-grow">
          {/* Category icon and name */}
          <div className="flex items-center text-zinc-500 dark:text-zinc-500 mb-1">
            {getCategoryIcon()}
            <span className="ml-1 text-xs">
              {pattern.category.charAt(0).toUpperCase() +
                pattern.category.slice(1)}
            </span>
          </div>

          {/* Pattern title */}
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {pattern.pattern_name}
          </div>

          {/* Frequency badge */}
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
                frequencyLabel === "trending"
                  ? "text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10"
                  : frequencyLabel === "case specific"
                  ? "text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/10"
                  : "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700/50 bg-blue-50/60 dark:bg-blue-900/10"
              }`}
            >
              {frequencyLabel}
            </span>
          </div>
        </div>

        {/* Expand/collapse chevron */}
        <div
          className="ml-auto p-2 text-purple-500 group-hover:text-purple-700 transition-colors"
          title={isExpanded ? "Hide details" : "Show details"}
        >
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
            className={`transition-transform duration-200 ease-in-out group-hover:scale-110 ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        </div>
      </div>

      {/* Expandable details section - no height limitation */}
      {isExpanded && (
        <div className="mt-2 mb-4 rounded text-xs w-full border border-zinc-200 dark:border-zinc-700 opacity-100 transition-opacity duration-200">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-mono border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <span className="text-left mr-2">Pattern Details</span>
            <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0">
              Impact & Context
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-zinc-900 text-left">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
              {pattern.description}
            </p>
            <div className="mt-2">
              <h5 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Impact:
              </h5>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {pattern.impact}
              </p>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default PatternItem;
