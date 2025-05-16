

interface CacheLegendProps {
  cachedPRIds: number[];
  newlyAnalyzedPRIds: number[];
  viewAllAnalyzedPRs?: boolean;
  allAnalyzedPRIds?: number[];
}

export default function CacheLegend({
  cachedPRIds,
  newlyAnalyzedPRIds,
  viewAllAnalyzedPRs = false,
  allAnalyzedPRIds = [],
}: CacheLegendProps) {
  // Determine count message based on view mode
  let countMessage;

  if (viewAllAnalyzedPRs) {
    countMessage = `Showing all ${allAnalyzedPRIds.length} analyzed PRs (${cachedPRIds.length} from cache)`;
  } else {
    countMessage = `${cachedPRIds.length} of ${
      cachedPRIds.length + newlyAnalyzedPRIds.length
    } PRs loaded from cache`;
  }

  return (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
      <div className="font-medium mb-1">Cache Status Legend:</div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 mr-1 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
          </svg>
          <span className="text-gray-600">Loaded from cache</span>
        </div>
        {!viewAllAnalyzedPRs && (
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 mr-1 text-blue-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-600">Newly analyzed</span>
          </div>
        )}
        {viewAllAnalyzedPRs && (
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 mr-1 text-purple-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-600">All analyzed PRs</span>
          </div>
        )}
        <div className="flex items-center">
          <span className="text-gray-600">{countMessage}</span>
        </div>
      </div>
    </div>
  );
}
