import React from "react";
import { Loader2 } from "lucide-react";

interface OverallSummaryProps {
  careerDevelopmentSummary: string | null | undefined;
  averageScore: number;
  isGeneratingSummary?: boolean;
}

export default function OverallSummary({
  careerDevelopmentSummary,
  averageScore,
  isGeneratingSummary,
}: OverallSummaryProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-lg border border-blue-100 dark:border-blue-800/50">
      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3 text-lg">
        Career Development Assessment
      </h4>
      {isGeneratingSummary ? (
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Generating summary...</span>
        </div>
      ) : careerDevelopmentSummary ? (
        <p className="text-gray-800 dark:text-gray-300">
          {careerDevelopmentSummary}
        </p>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 italic">
          Summary not generated yet. Select PRs and click "Generate Summary".
        </p>
      )}
      <div className="mt-4 flex items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400 mr-2 font-medium">
          Quality Score:
        </div>
        <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
        <div className="ml-2 font-medium text-gray-700 dark:text-gray-300">
          {averageScore.toFixed(1)}/10
        </div>
      </div>
    </div>
  );
}
