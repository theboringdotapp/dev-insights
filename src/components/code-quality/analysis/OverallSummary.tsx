import React from "react";

interface OverallSummaryProps {
  overallSummary: string;
  averageScore: number;
}

export default function OverallSummary({
  overallSummary,
  averageScore,
}: OverallSummaryProps) {
  return (
    <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
      <h4 className="font-medium text-blue-800 mb-3 text-lg">
        Career Development Assessment
      </h4>
      <p className="text-gray-800">{overallSummary}</p>
      <div className="mt-4 flex items-center">
        <div className="text-sm text-gray-600 mr-2 font-medium">
          Quality Score:
        </div>
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              averageScore >= 8
                ? "bg-green-500"
                : averageScore >= 6
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{
              width: `${(averageScore / 10) * 100}%`,
            }}
          ></div>
        </div>
        <div className="ml-2 font-medium">{averageScore.toFixed(1)}/10</div>
      </div>
    </div>
  );
}
