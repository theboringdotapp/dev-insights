import React from "react";
import PRFeatureItem from "./PRFeatureItem";
import { FeedbackFrequency } from "../../../lib/types";

interface PRFeatureListProps {
  features: FeedbackFrequency[];
  type: "strength" | "weakness" | "suggestion";
  displayedPRIds?: number[];
}

export default function PRFeatureList({
  features,
  type,
  displayedPRIds = [],
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

  return (
    <div className="space-y-3">
      {features.map((feature, i) => (
        <PRFeatureItem
          key={i}
          feature={feature}
          typeStyles={typeStyles}
          displayedPRIds={displayedPRIds}
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
