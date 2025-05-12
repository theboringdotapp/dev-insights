import React from "react";
import { PRAnalysisResult } from "../../lib/types";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../ui/Collapsible";
import FeedbackSection from "./FeedbackSection";

// Icons
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

const ImprovementIcon = () => (
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

const OpportunityIcon = () => (
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

const CareerIcon = () => (
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
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

interface PRAnalysisDetailsProps {
  analysisResult: PRAnalysisResult;
  defaultOpen?: boolean;
}

/**
 * PRAnalysisDetails component displays the AI feedback for a specific pull request
 * in an expandable/collapsible format.
 */
export function PRAnalysisDetails({
  analysisResult,
  defaultOpen = false,
}: PRAnalysisDetailsProps) {
  // Extract feedback from analysis
  const { feedback } = analysisResult;

  if (!feedback) {
    return null;
  }

  // Only show top items in each category for a concise view
  const limitItems = (items: FeedbackItem[]) => items.slice(0, 2);

  return (
    <div className="">
      <Collapsible defaultOpen={defaultOpen} className="group">
        <CollapsibleTrigger className="flex items-center w-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700/50 cursor-pointer">
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
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <span>Analysis Details</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="ml-auto h-3 w-3 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
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

        <CollapsibleContent className="pt-3">
          <div className="space-y-4 px-1">
            {/* Strengths Section - Limited to top items */}
            <FeedbackSection
              title="Key Strengths"
              items={limitItems(feedback.strengths)}
              badgeColor="text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
              iconComponent={<StrengthIcon />}
            />

            {/* Improvement Areas Section - Limited to top items */}
            <FeedbackSection
              title="Main Improvement Areas"
              items={limitItems(feedback.areas_for_improvement)}
              badgeColor="text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
              iconComponent={<ImprovementIcon />}
            />

            {/* Link to full analysis */}
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-3 italic text-right">
              <span>See Code Quality Assistant for full analysis</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default PRAnalysisDetails;
