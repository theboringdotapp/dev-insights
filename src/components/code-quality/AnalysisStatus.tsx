import React from "react";

export default function AnalysisStatus() {
  return (
    <div className="my-6 text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
      <p className="text-gray-500 mb-4">
        AI analysis requires an API key to examine your PRs and provide insights
        on code quality, patterns, and career growth opportunities.
      </p>
      <p className="text-blue-600 font-medium mb-4">
        Please click "Show Settings" above to provide an API key.
      </p>
    </div>
  );
}
