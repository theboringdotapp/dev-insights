import React from "react"

interface MetricsSummaryProps {
  analyzedPRCount: number
  averageScore?: number
}

/**
 * MetricsSummary displays high-level metrics about analyzed PRs
 * in a clean, visually appealing format.
 */
function MetricsSummary({
  analyzedPRCount,
  averageScore
}: MetricsSummaryProps) {
  // Format average score as percentage (assuming 0-10 scale, converting to 0-100%)
  const formattedScore = averageScore !== undefined 
    ? `${Math.min(100, Math.round((averageScore / 10) * 100))}%` 
    : '--'

  return (
    <div className="bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/10 dark:to-zinc-800/30 rounded-lg p-4">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 text-left">
        Analysis Overview
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* PRs Analyzed */}
        <div className="rounded-md p-3 bg-white/50 dark:bg-zinc-800/30 backdrop-blur-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 text-left">PRs Analyzed</div>
          <div className="flex items-baseline justify-start">
            <span className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
              {analyzedPRCount}
            </span>
            <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
              total
            </span>
          </div>
        </div>
        
        {/* Average Score */}
        <div className="rounded-md p-3 bg-white/50 dark:bg-zinc-800/30 backdrop-blur-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 text-left">Average Quality</div>
          <div className="flex items-baseline justify-start">
            <span className={`text-xl font-semibold ${
              !averageScore ? 'text-zinc-400 dark:text-zinc-500' :
              (averageScore / 10) >= 0.8 ? 'text-green-600 dark:text-green-400' :
              (averageScore / 10) >= 0.6 ? 'text-amber-600 dark:text-amber-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {formattedScore}
            </span>
            <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
              score
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetricsSummary