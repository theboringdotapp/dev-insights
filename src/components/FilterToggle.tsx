import { Switch } from "./ui/Switch";

interface FilterToggleProps {
  showOnlyImportantPRs: boolean;
  onChange: (showOnlyImportant: boolean) => void;
  importantCount?: number;
  totalCount?: number;
}

export function FilterToggle({
  showOnlyImportantPRs,
  onChange,
  importantCount,
  totalCount,
}: FilterToggleProps) {
  // Only show counts if both are provided
  const showCounts = importantCount !== undefined && totalCount !== undefined;

  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={showOnlyImportantPRs}
        onCheckedChange={onChange}
        id="pr-filter"
      />
      <label
        htmlFor="pr-filter"
        className="text-sm font-medium cursor-pointer flex items-center"
      >
        {showOnlyImportantPRs
          ? "Showing important PRs only"
          : "Showing all PRs"}

        {showCounts && (
          <span className="ml-2 bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5">
            {showOnlyImportantPRs
              ? `${importantCount}/${totalCount}`
              : `${totalCount} total`}
          </span>
        )}
      </label>
    </div>
  );
}
