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
  cachedPRIds: number[];
  newlyAnalyzedPRIds: number[];
  displayedPRIds?: number[];
  viewAllAnalyzedPRs?: boolean;
}

export default function PRFeatureItem({
  feature,
  typeStyles,
  icon,
  cachedPRIds,
  newlyAnalyzedPRIds,
  displayedPRIds = [],
  viewAllAnalyzedPRs = false,
}: PRFeatureItemProps) {
  // Filter displayed PRs based on view mode
  const visiblePRs = viewAllAnalyzedPRs
    ? feature.prIds.filter((id) => displayedPRIds.includes(id))
    : feature.prIds;

  // Count of displayed PRs
  const visibleCount = visiblePRs.length;

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
          {viewAllAnalyzedPRs && visibleCount !== feature.count ? (
            <span>
              Found in {feature.count} PRs (showing {visibleCount}):
            </span>
          ) : (
            <span>
              Found in {feature.count} PR{feature.count !== 1 ? "s" : ""}:
            </span>
          )}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {feature.prUrls.map((url, idx) => {
              const prId = feature.prIds[idx];
              // A PR can only be either cached OR newly analyzed, not both
              // Prioritize "cached" status over "newly analyzed" to prevent dual labeling
              const isCached = cachedPRIds.includes(prId);
              // Only consider it newly analyzed if it's not already cached
              const isNewlyAnalyzed =
                !isCached && newlyAnalyzedPRIds.includes(prId);

              // Skip if not visible in current view mode
              if (viewAllAnalyzedPRs && !displayedPRIds.includes(prId)) {
                return null;
              }

              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center px-2 py-1 bg-white rounded border ${typeStyles.link}`}
                  title={`${feature.prTitles[idx]}${
                    isCached ? " (loaded from cache)" : ""
                  }`}
                >
                  #{url.split("/").pop()}
                  {isCached && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 ml-1 text-green-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                    </svg>
                  )}
                  {isNewlyAnalyzed && !viewAllAnalyzedPRs && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 ml-1 text-blue-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
