import React from "react";
import { MetaAnalysisResult } from "../../lib/types";
import { GanttChartIcon, Users2Icon } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../components/ui/Collapsible";
import RecurringPatterns from "./RecurringPatterns";
import FocusAreas from "./FocusAreas";

// Simple UI components using Tailwind
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
  ></div>
);

// Badge component removed as it's now handled by PatternBadge

interface MetaAnalysisProps {
  metaAnalysis: MetaAnalysisResult | null;
  isLoading: boolean;
  error?: string | null;
}

// Pattern styling is now handled by PatternBadge and PatternItem components

// Note: We're now using the external RecurringPatterns component

// Using imported FocusAreas component

export default function MetaAnalysis({
  metaAnalysis,
  isLoading,
  error,
}: MetaAnalysisProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-5/6" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
        Failed to generate meta-analysis: {error}
      </div>
    );
  }

  // Empty state - no analysis yet
  if (!metaAnalysis) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
          Select multiple analyzed PRs to generate a meta-analysis across all of
          them.
        </p>
      </div>
    );
  }

  const { recurring_patterns, recommended_focus_areas, managerial_insights } =
    metaAnalysis;

  return (
    <div className="space-y-6">
      {/* Recurring Patterns Section - Always open by default */}
      <RecurringPatterns
        patterns={recurring_patterns}
        isLoading={isLoading}
        defaultOpen={true}
      />

      {/* Recommended Focus Areas - Expandable */}
      <div className="mt-2 pt-1">
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger className="flex items-center w-full text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors px-2.5 py-2.5 rounded-md border border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20">
            <GanttChartIcon className="mr-1.5 h-4 w-4" />
            <span className="ml-1.5">Recommended Focus Areas</span>
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
                Prioritized areas to focus on for growth
              </div>
              <FocusAreas areas={recommended_focus_areas} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Managerial Insights - Expandable */}
      <div className="mt-2 pt-1">
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger className="flex items-center w-full text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors px-2.5 py-2.5 rounded-md border border-purple-200 dark:border-purple-700/50 bg-purple-50/60 dark:bg-purple-900/10 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20">
            <Users2Icon className="mr-1.5 h-4 w-4" />
            <span className="ml-1.5">Managerial Insights</span>
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
            <div className="pt-4 pb-1 px-1 text-left">
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 text-left">
                Suggestions for managers to support growth
              </div>
              <div className="space-y-3 text-left">
                <div>
                  <h4 className="text-xs font-medium text-zinc-900 mb-1 text-left">
                    Strengths to Leverage:
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 text-left">
                    {managerial_insights.strengths_to_leverage}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-zinc-900 mb-1 text-left">
                    Growth Support:
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 text-left">
                    {managerial_insights.growth_support}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-zinc-900 mb-1 text-left">
                    Project Recommendations:
                  </h4>
                  <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300 text-left">
                    {managerial_insights.project_recommendations}
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
