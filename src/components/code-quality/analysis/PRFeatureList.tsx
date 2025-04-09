import React from "react";
import PRFeatureItem from "./PRFeatureItem";

interface Feature {
  text: string;
  count: number;
  prIds: number[];
  prUrls: string[];
  prTitles: string[];
}

interface PRFeatureListProps {
  features: Feature[];
  type: "strength" | "weakness" | "suggestion";
  cachedPRIds: number[];
  newlyAnalyzedPRIds: number[];
  displayedPRIds?: number[];
  viewAllAnalyzedPRs?: boolean;
}

export default function PRFeatureList({
  features,
  type,
  cachedPRIds,
  newlyAnalyzedPRIds,
  displayedPRIds = [],
  viewAllAnalyzedPRs = false,
}: PRFeatureListProps) {
  // Define styling based on type
  const getTypeStyles = () => {
    switch (type) {
      case "strength":
        return {
          container: "bg-green-50 border-green-100",
          icon: "text-green-600",
          link: "border-green-200 text-green-700 hover:bg-green-50",
        };
      case "weakness":
        return {
          container: "bg-red-50 border-red-100",
          icon: "text-red-600",
          link: "border-red-200 text-red-700 hover:bg-red-50",
        };
      case "suggestion":
        return {
          container: "bg-blue-50 border-blue-100",
          icon: "text-blue-600",
          link: "border-blue-200 text-blue-700 hover:bg-blue-50",
        };
      default:
        return {
          container: "bg-gray-50 border-gray-100",
          icon: "text-gray-600",
          link: "border-gray-200 text-gray-700 hover:bg-gray-50",
        };
    }
  };

  const typeStyles = getTypeStyles();

  // Get the appropriate icon for the type
  const getIcon = () => {
    switch (type) {
      case "strength":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "weakness":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "suggestion":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {features.map((feature, i) => (
        <PRFeatureItem
          key={i}
          feature={feature}
          typeStyles={typeStyles}
          icon={getIcon()}
          cachedPRIds={cachedPRIds}
          newlyAnalyzedPRIds={newlyAnalyzedPRIds}
          displayedPRIds={displayedPRIds}
          viewAllAnalyzedPRs={viewAllAnalyzedPRs}
        />
      ))}
      {features.length === 0 && (
        <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">
          No consistent{" "}
          {type === "strength"
            ? "strengths"
            : type === "weakness"
            ? "areas for improvement"
            : "growth opportunities"}{" "}
          identified
        </div>
      )}
    </div>
  );
}
