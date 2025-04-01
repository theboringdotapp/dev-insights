import React from "react";

export type Timeframe = "1week" | "1month" | "3months" | "6months" | "1year";

interface TimeframeSelectorProps {
  selectedTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export function TimeframeSelector({
  selectedTimeframe,
  onTimeframeChange,
}: TimeframeSelectorProps) {
  const timeframes: { value: Timeframe; label: string }[] = [
    { value: "1week", label: "1 Week" },
    { value: "1month", label: "1 Month" },
    { value: "3months", label: "3 Months" },
    { value: "6months", label: "6 Months" },
    { value: "1year", label: "1 Year" },
  ];

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700">Timeframe:</label>
      <div className="flex rounded-md overflow-hidden border border-gray-300">
        {timeframes.map((timeframe) => (
          <button
            key={timeframe.value}
            type="button"
            className={`px-3 py-1.5 text-sm ${
              selectedTimeframe === timeframe.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onTimeframeChange(timeframe.value)}
          >
            {timeframe.label}
          </button>
        ))}
      </div>
    </div>
  );
}
