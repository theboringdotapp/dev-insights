import React from "react";
import { 
  MetaAnalysisResult, 
  RecurringPattern, 
  FocusArea 
} from "../../lib/types";
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  TrendingUpIcon,
  BrainCircuitIcon,
  GanttChartIcon,
  Users2Icon
} from "lucide-react";
import { 
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../components/ui/Collapsible";

// Simple UI components using Tailwind
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
);

// Card components
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-medium text-zinc-800 dark:text-zinc-200 ${className}`}>{children}</h3>
);

const CardDescription = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>{children}</p>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-4 pt-0 ${className}`}>{children}</div>
);

const Badge = ({ children, className = "", variant = "default" }: { 
  children: React.ReactNode, 
  className?: string,
  variant?: "default" | "outline" 
}) => {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  const variantStyles = variant === "outline" 
    ? "border" 
    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  
  return (
    <span className={`${baseStyles} ${variantStyles} ${className}`}>{children}</span>
  );
};

interface MetaAnalysisProps {
  metaAnalysis: MetaAnalysisResult | null;
  isLoading: boolean;
  error?: string | null;
}

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'strength':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    case 'refinement':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    case 'learning':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800';
    default:
      return 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700';
  }
};

const PatternFrequencyBadge = ({ frequency }: { frequency: string }) => {
  // Determine color based on frequency keywords
  const getColor = () => {
    const lowerFreq = frequency.toLowerCase();
    if (lowerFreq.includes('very common') || lowerFreq.includes('frequent') || lowerFreq.includes('high')) {
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    } else if (lowerFreq.includes('occasional') || lowerFreq.includes('moderate')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    } else {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
    }
  };

  return (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getColor()}`}>
      {frequency}
    </Badge>
  );
};

// Recurring Patterns Section
const RecurringPatterns = ({ patterns }: { patterns: RecurringPattern[] }) => {
  const [expandedPattern, setExpandedPattern] = React.useState<string | null>(null);

  if (!patterns || patterns.length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic">
        No recurring patterns detected yet. Analyze more PRs to generate patterns.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patterns.map((pattern, index) => (
        <div 
          key={index}
          className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
        >
          <div 
            className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 cursor-pointer"
            onClick={() => setExpandedPattern(expandedPattern === pattern.pattern_name ? null : pattern.pattern_name)}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${getCategoryColor(pattern.category)}`}>
                {pattern.category.charAt(0).toUpperCase() + pattern.category.slice(1)}
              </Badge>
              <h4 className="font-medium text-sm">{pattern.pattern_name}</h4>
              <PatternFrequencyBadge frequency={pattern.frequency} />
            </div>
            <div>
              {expandedPattern === pattern.pattern_name ? 
                <ChevronUpIcon className="h-4 w-4 text-zinc-500" /> : 
                <ChevronDownIcon className="h-4 w-4 text-zinc-500" />}
            </div>
          </div>
          
          {expandedPattern === pattern.pattern_name && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                {pattern.description}
              </p>
              <div className="mt-2">
                <h5 className="text-xs font-medium text-zinc-500 mb-1">Impact:</h5>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {pattern.impact}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

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
        <div key={index} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
          <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
            {area.area}
          </h3>
          <div className="space-y-2">
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">Why focus here:</h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {area.why}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">Resources:</h4>
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

export default function MetaAnalysis({ metaAnalysis, isLoading, error }: MetaAnalysisProps) {
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
          Select multiple analyzed PRs to generate a meta-analysis across all of them.
        </p>
      </div>
    );
  }

  const { recurring_patterns, recommended_focus_areas, development_trajectory, managerial_insights } = metaAnalysis;

  return (
    <div className="space-y-6">
      {/* Recurring Patterns Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <BrainCircuitIcon className="h-4 w-4 text-purple-500 mr-2" />
            <CardTitle className="text-base">Recurring Patterns</CardTitle>
          </div>
          <CardDescription>
            Patterns detected across multiple pull requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecurringPatterns patterns={recurring_patterns} />
        </CardContent>
      </Card>

      {/* Development Trajectory */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <TrendingUpIcon className="h-4 w-4 text-purple-500 mr-2" />
            <CardTitle className="text-base">Development Trajectory</CardTitle>
          </div>
          <CardDescription>
            Current position and path forward
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">Current Level:</h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {development_trajectory.current_level}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">Next Milestone:</h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {development_trajectory.next_milestone}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">Key Actions:</h4>
              <ul className="list-disc pl-4 text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                {development_trajectory.key_actions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Focus Areas - Expandable */}
      <Collapsible className="w-full">
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
              <div className="flex items-center">
                <GanttChartIcon className="h-4 w-4 text-purple-500 mr-2" />
                <CardTitle className="text-base">Recommended Focus Areas</CardTitle>
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
      <Collapsible className="w-full">
        <Card>
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
                  <h4 className="text-xs font-medium text-zinc-500 mb-1">Strengths to Leverage:</h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {managerial_insights.strengths_to_leverage}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 mb-1">Growth Support:</h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {managerial_insights.growth_support}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 mb-1">Project Recommendations:</h4>
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