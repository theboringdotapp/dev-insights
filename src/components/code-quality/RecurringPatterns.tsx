import * as React from "react";
import { RecurringPattern } from "../../lib/types";
import PatternItem from "./PatternItem";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/Collapsible";

// Pattern icon
const PatternIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-purple-600 dark:text-purple-400"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
    <line x1="15" y1="3" x2="15" y2="21"></line>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="3" y1="15" x2="21" y2="15"></line>
  </svg>
);

interface RecurringPatternsProps {
  patterns: RecurringPattern[];
  isLoading?: boolean;
  defaultOpen?: boolean;
}

function RecurringPatterns({
  patterns,
  isLoading = false,
  defaultOpen = true,
}: RecurringPatternsProps) {
  // Always start with patterns section open
  const [isOpen, setIsOpen] = React.useState(true);

  // Update internal state when defaultOpen prop changes
  React.useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  // Simple open/close handler without animation tracking
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-2 pt-1">
        <div className="flex items-center w-full text-xs font-medium text-purple-600 dark:text-purple-400 px-2.5 py-2 rounded-md border border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10">
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
          Loading patterns...
        </div>
      </div>
    );
  }

  // Empty state
  if (!patterns || patterns.length === 0) {
    return (
      <div className="mt-2 pt-1">
        <div className="flex items-center w-full text-xs font-medium text-zinc-600 dark:text-zinc-400 px-2.5 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1.5 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <path d="M13 2v7h7"></path>
          </svg>
          No recurring patterns detected. Analyze more PRs to generate patterns.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-1">
      <div className="group">
        <div>
          <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
            <CollapsibleTrigger className="flex items-center w-full text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors px-2.5 py-2.5 rounded-md border border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20">
              <PatternIcon />
              <span className="ml-1.5">View Recurring Patterns</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="ml-auto h-4 w-4 text-purple-500 dark:text-purple-400 transition-transform duration-300 group-data-[state=open]:rotate-180"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="pt-4 pb-1 px-1">
                <div className="text-sm text-left text-zinc-500 dark:text-zinc-400 mb-4">
                  Patterns detected across multiple pull requests
                </div>
                <ul className="space-y-4">
                  {[...patterns]
                    .sort((a, b) => {
                      // Sort by frequency: trending first, case specific last
                      const getFrequencyWeight = (
                        pattern: RecurringPattern,
                      ) => {
                        const frequency = pattern.frequency.toLowerCase();
                        if (frequency.includes("very common")) return 0; // trending (very common) first
                        if (frequency.includes("common")) return 1; // common second
                        if (frequency.includes("occasional")) return 2; // case specific (occasional) last
                        return 1; // default weight
                      };
                      return getFrequencyWeight(a) - getFrequencyWeight(b);
                    })
                    .map((pattern, index) => (
                      <PatternItem
                        key={index}
                        pattern={pattern}
                        index={index + 1}
                      />
                    ))}
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}

export default RecurringPatterns;
