import React from "react"
import { FeedbackItem } from "../../lib/types"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/Collapsible"

interface InsightsSummaryProps {
  isGeneratingSummary: boolean
  careerDevelopmentSummary: string | null
  onGenerateSummary: () => void
  commonStrengths: FeedbackItem[]
  commonWeaknesses: FeedbackItem[]
  commonSuggestions: FeedbackItem[]
}

// Icons
const StrengthIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
  </svg>
)

const WeaknessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const SuggestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
    <path d="M12 2v8" />
    <path d="m4.93 10.93 1.41 1.41" />
    <path d="M2 18h2" />
    <path d="M20 18h2" />
    <path d="m19.07 10.93-1.41 1.41" />
    <path d="M22 22H2" />
    <path d="m8 22 4-10 4 10" />
  </svg>
)

const CareerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
)

/**
 * InsightsSummary displays common patterns and career development insights
 * from analyzed PRs in an organized, user-friendly format.
 */
export function InsightsSummary({
  isGeneratingSummary,
  careerDevelopmentSummary,
  onGenerateSummary,
  commonStrengths,
  commonWeaknesses,
  commonSuggestions
}: InsightsSummaryProps) {
  // Check if we have any patterns to display
  const hasPatterns = commonStrengths.length > 0 || 
                      commonWeaknesses.length > 0 || 
                      commonSuggestions.length > 0
  
  return (
    <div className="bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/10 dark:to-zinc-800/30 rounded-lg p-4">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 text-left">
        Development Insights
      </h3>
      
      {/* Common Patterns Section */}
      {hasPatterns ? (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2 text-left">
            Common Patterns <span className="text-xs text-zinc-400 dark:text-zinc-500">(Summary)</span>
          </h4>
          
          <div className="space-y-3">
            {/* Strengths */}
            {commonStrengths.length > 0 && (
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger className="flex items-center text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 w-full text-left rounded-md py-1 px-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  <span className="mr-1.5"><StrengthIcon /></span>
                  Your Strengths
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" 
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
                  <ul className="mt-2 space-y-1.5 pl-6">
                    {commonStrengths.map((item, index) => (
                      <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc text-left">
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Weaknesses */}
            {commonWeaknesses.length > 0 && (
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger className="flex items-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 w-full text-left rounded-md py-1 px-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  <span className="mr-1.5"><WeaknessIcon /></span>
                  Areas for Improvement
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" 
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
                  <ul className="mt-2 space-y-1.5 pl-6">
                    {commonWeaknesses.map((item, index) => (
                      <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc text-left">
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Suggestions */}
            {commonSuggestions.length > 0 && (
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 w-full text-left rounded-md py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <span className="mr-1.5"><SuggestionIcon /></span>
                  Growth Opportunities
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" 
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
                  <ul className="mt-2 space-y-1.5 pl-6">
                    {commonSuggestions.map((item, index) => (
                      <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 list-disc text-left">
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 italic mb-4 text-left">
          No common patterns identified yet. Analyze more PRs to discover patterns.
        </div>
      )}
      
      {/* Career Development Summary Section */}
      <div className="pt-3 mt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 flex items-center text-left">
            <span className="mr-1.5"><CareerIcon /></span>
            Career Development Summary
          </h4>
          
          {!isGeneratingSummary && !careerDevelopmentSummary && (
            <button
              onClick={onGenerateSummary}
              className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800/50 py-1 px-2 rounded transition-colors"
            >
              Generate Summary
            </button>
          )}
        </div>
        
        {isGeneratingSummary ? (
          <div className="mt-3 flex items-center text-sm text-zinc-500 dark:text-zinc-400 text-left">
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
            Generating career development insights...
          </div>
        ) : careerDevelopmentSummary ? (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-800/30 backdrop-blur-sm p-3 rounded-md text-left">
            {careerDevelopmentSummary}
          </div>
        ) : (
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 italic text-left">
            Generate a summary to get personalized career development insights based on your coding patterns.
          </div>
        )}
      </div>
    </div>
  )
}

export default InsightsSummary