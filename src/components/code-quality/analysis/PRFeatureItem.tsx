import React from "react";

interface Feature {
  text: string;
  count: number;
  prIds: number[];
  prUrls: string[];
  prTitles: string[];
}

interface TypeStyles {
  container: string;
  icon: string;
  link: string;
}

interface PRFeatureItemProps {
  feature: Feature;
  typeStyles: TypeStyles;
  icon: React.ReactNode;
  displayedPRIds?: number[];
}

export default function PRFeatureItem({
  feature,
  typeStyles,
  icon,
  displayedPRIds = [],
}: PRFeatureItemProps) {
  // Filter displayed PRs
  const visiblePRs = feature.prIds.filter((id) => displayedPRIds.includes(id));

  // If no displayedPRIds provided, show all
  const showAll = displayedPRIds.length === 0;
  const filteredPRs = showAll ? feature.prIds : visiblePRs;
  const actualCount = filteredPRs.length;

  return (
    <div className={`p-4 ${typeStyles.container} rounded-lg border`}>
      <div className="flex items-start mb-2">
        <div className={`${typeStyles.icon} mr-3 flex-shrink-0 mt-0.5`}>
          {icon}
        </div>
        <div>
          <h5 className="font-medium text-gray-800 text-base">
            {feature.text.charAt(0).toUpperCase() + feature.text.slice(1)}
          </h5>
        </div>
      </div>

      <div className="ml-8">
        <div className="text-xs text-gray-500 text-left">
          {!showAll && actualCount !== feature.count ? (
            <span>
              Found in {feature.count} PRs (showing {actualCount}):
            </span>
          ) : (
            <span>
              Found in {feature.count} PR{feature.count !== 1 ? "s" : ""}:
            </span>
          )}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {feature.prUrls.map((url, idx) => {
              const prId = feature.prIds[idx];

              // Skip if not visible in current filtered view
              if (!showAll && !displayedPRIds.includes(prId)) {
                return null;
              }

              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center px-2 py-1 bg-white rounded border ${typeStyles.link}`}
                  title={feature.prTitles[idx]}
                >
                  #{url.split("/").pop()}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
