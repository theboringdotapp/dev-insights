import React from "react";
import { MetaAnalysisResult, FocusArea } from "../../lib/types";
import {
  ChevronDownIcon,
  TrendingUpIcon,
  GanttChartIcon,
  Users2Icon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../components/ui/Collapsible";
import RecurringPatterns from "./RecurringPatterns";

// Simple UI components using Tailwind
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
  ></div>
);

// Card components
const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-4 ${className}`}>{children}</div>;

const CardTitle = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h3
    className={`text-lg font-medium text-zinc-800 dark:text-zinc-200 ${className}`}
  >
    {children}
  </h3>
);

const CardDescription = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>
    {children}
  </p>
);

const CardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-4 pt-0 ${className}`}>{children}</div>;

// Badge component removed as it's now handled by PatternBadge

interface MetaAnalysisProps {
  metaAnalysis: MetaAnalysisResult | null;
  isLoading: boolean;
  error?: string | null;
}

// Pattern styling is now handled by PatternBadge and PatternItem components

// Note: We're now using the external RecurringPatterns component

// Focus Areas Section
const FocusAreas = ({ areas }: { areas: FocusArea[] }) => {
  if (!areas || areas.length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic">
        No focus areas identified yet. Add more PR analysis data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {areas.map((area, index) => (
        <div
          key={index}
          className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3"
        >
          <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
            {area.area}
          </h3>
          <div className="space-y-2">
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">
                Why focus here:
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {area.why}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">
                Resources:
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {area.resources}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

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

  const {
    recurring_patterns,
    recommended_focus_areas,
    development_trajectory,
    managerial_insights,
  } = metaAnalysis;

  return (
    <div className="space-y-6">
      {/* Recurring Patterns Section - Always open by default */}
      <RecurringPatterns
        patterns={recurring_patterns}
        isLoading={isLoading}
        defaultOpen={true}
      />

      {/* Recommended Focus Areas - Expandable */}
      <Collapsible>
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
              <div className="flex items-center">
                <GanttChartIcon className="h-4 w-4 text-purple-500 mr-2" />
                <CardTitle className="text-base">
                  Recommended Focus Areas
                </CardTitle>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-zinc-500" />
            </CollapsibleTrigger>
            <CardDescription>
              Prioritized areas to focus on for growth
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <FocusAreas areas={recommended_focus_areas} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Managerial Insights - Expandable */}
      <Collapsible>
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
              <div className="flex items-center">
                <Users2Icon className="h-4 w-4 text-purple-500 mr-2" />
                <CardTitle className="text-base">Managerial Insights</CardTitle>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-zinc-500" />
            </CollapsibleTrigger>
            <CardDescription>
              Suggestions for managers to support growth
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 mb-1">
                    Strengths to Leverage:
                  </h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {managerial_insights.strengths_to_leverage}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-zinc-500 mb-1">
                    Growth Support:
                  </h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {managerial_insights.growth_support}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-zinc-500 mb-1">
                    Project Recommendations:
                  </h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {managerial_insights.project_recommendations}
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
