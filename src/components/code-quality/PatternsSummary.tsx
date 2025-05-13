import * as React from "react";
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

// Pattern icon
const PatternIcon = () => (
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
    className="text-purple-600 dark:text-purple-400"
  >
    <path d="M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8.5"></path>
    <path d="M22 12.5a2.5 2.5 0 0 0-5 0v4"></path>
    <path d="M17 15.5v-1a1.5 1.5 0 0 1 3 0v1"></path>
    <path d="M22 16.5a2.5 2.5 0 0 1-5 0v-4"></path>
  </svg>
);

interface PatternsSummaryProps {
  patterns: RecurringPattern[];
}

export function PatternsSummary({
  patterns
}: PatternsSummaryProps) {
  if (!patterns || patterns.length === 0) {
    return null;
  }

  // Count patterns by category
  const countByCategory = patterns.reduce((acc, pattern) => {
    const category = pattern.category.toLowerCase();
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get trending patterns count (formerly very common)
  const trendingCount = patterns.filter(pattern => 
    pattern.frequency.toLowerCase().includes("very common")
  ).length;
  
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {/* Patterns count badge */}
      <div className="flex items-center bg-purple-50/60 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 text-xs px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-700/50">
        <PatternIcon />
        <span className="ml-1">{patterns.length} pattern{patterns.length !== 1 ? 's' : ''}</span>
      </div>
      
      {/* Strength count with icon */}
      {countByCategory.strength > 0 && (
        <div className="flex items-center border border-zinc-200 dark:border-zinc-700 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs px-2.5 py-1 rounded-full">
          <StrengthIcon />
          <span className="ml-1">{countByCategory.strength} strength{countByCategory.strength !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {/* Refinement count with icon */}
      {countByCategory.refinement > 0 && (
        <div className="flex items-center border border-zinc-200 dark:border-zinc-700 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs px-2.5 py-1 rounded-full">
          <RefinementIcon />
          <span className="ml-1">{countByCategory.refinement} refinement{countByCategory.refinement !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {/* Learning paths count with icon */}
      {countByCategory.learning > 0 && (
        <div className="flex items-center border border-zinc-200 dark:border-zinc-700 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs px-2.5 py-1 rounded-full">
          <LearningIcon />
          <span className="ml-1">{countByCategory.learning} learning path{countByCategory.learning !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {/* Trending patterns indicator (formerly very common) */}
      {trendingCount > 0 && (
        <div className="flex items-center border border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 text-xs px-2.5 py-1 rounded-full">
          <span>{trendingCount} trending</span>
        </div>
      )}
    </div>
  );
}

export default PatternsSummary;