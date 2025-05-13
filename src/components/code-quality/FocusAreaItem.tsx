import * as React from "react";
import { useState } from "react";
import { FocusArea } from "../../lib/types";

// Shimmer animation keyframes
const shimmerAnimation = `
@keyframes shimmer {
  0% { background-position: 0% 0; }
  100% { background-position: -200% 0; }
}
.animate-shimmer {
  animation: shimmer 6s infinite linear;
}
`;

interface FocusAreaItemProps {
  area: FocusArea;
}

export function FocusAreaItem({ area }: FocusAreaItemProps) {
  // Add style tag for shimmer animation
  React.useEffect(() => {
    if (!document.getElementById("shimmer-animation")) {
      const style = document.createElement("style");
      style.id = "shimmer-animation";
      style.innerHTML = shimmerAnimation;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <li className="flex flex-col">
      <div
        className="flex items-center group cursor-pointer hover:bg-purple-50/30 dark:hover:bg-purple-900/10 rounded-md p-3 hover:shadow-sm relative overflow-hidden"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* No index number as requested */}

        {/* Icon and focus area details */}
        <div className="flex flex-col text-left flex-grow">
          {/* Area title - removed label as requested */}
          <div className="text-sm font-medium text-purple-800 dark:text-purple-400">
            {area.area}
          </div>
        </div>

        {/* Expand/collapse chevron */}
        <div
          className="ml-auto p-2 text-purple-500 hover:text-purple-700"
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
            className={`transition-transform duration-200 ease-in-out group-hover:scale-110 ${isExpanded ? "rotate-90" : ""}`}
          >
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        </div>
      </div>

      {/* Expandable details section */}
      {isExpanded && (
        <div className="mt-2 mb-4 rounded text-xs w-full border border-zinc-200 dark:border-zinc-700 opacity-100 transition-opacity duration-200">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-mono border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <span className="text-left mr-2">Focus Area Details</span>
            <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0">
              Why & Resources
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-zinc-900 text-left">
            <div className="mb-3">
              <h5 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Why focus here:
              </h5>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {area.why}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Resources:
              </h5>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {area.resources}
              </p>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default FocusAreaItem;
