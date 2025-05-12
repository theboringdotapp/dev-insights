import React from "react"
import { FeedbackItem } from "../../lib/types"

interface FeedbackSectionProps {
  title: string
  items: FeedbackItem[]
  badgeColor: string
  iconComponent?: React.ReactNode
}

/**
 * FeedbackSection component displays a category of feedback items
 * with consistent styling and proper handling of empty states.
 */
export function FeedbackSection({
  title,
  items,
  badgeColor,
  iconComponent
}: FeedbackSectionProps) {
  // Don't render anything if there are no items
  if (!items || items.length === 0) {
    return null
  }
  
  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center">
        {iconComponent && <span className="mr-1.5">{iconComponent}</span>}
        {title}
      </h4>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start">
            <span className={`mt-0.5 mr-2 px-1.5 py-0.5 text-xs rounded flex-shrink-0 ${badgeColor}`}>
              {index + 1}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default FeedbackSection