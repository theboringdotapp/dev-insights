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
    <div>
      <div className="flex rounded-md overflow-hidden border border-input bg-background">
        {timeframes.map((timeframe) => (
          <button
            key={timeframe.value}
            type="button"
            className={`px-3 py-1.5 text-sm flex-1 transition-colors cursor-pointer ${
              selectedTimeframe === timeframe.value
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-background text-foreground hover:bg-muted"
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
