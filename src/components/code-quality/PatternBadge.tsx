type BadgeVariant = "category" | "frequency";
type CategoryType = "strength" | "refinement" | "learning" | "default";
type FrequencyType = "trending" | "common" | "case specific" | "rare";

interface PatternBadgeProps {
  label: string;
  variant: BadgeVariant;
  type?: CategoryType | FrequencyType;
  className?: string;
}

export function PatternBadge({
  label,
  variant,
  type = "default",
  className = "",
}: PatternBadgeProps) {
  const getVariantStyles = (): string => {
    // Base styles for all badges
    const baseStyle =
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border";

    if (variant === "category") {
      // For categories, use a consistent style with no color differentiation
      return `${baseStyle} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700`;
    } else if (variant === "frequency") {
      // Handle frequency badges with more neutral colors
      const lowercasedType = type.toString().toLowerCase();
      if (lowercasedType.includes("trending")) {
        return `${baseStyle} bg-purple-50/60 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-700/50`;
      } else if (lowercasedType.includes("case")) {
        return `${baseStyle} bg-zinc-50/60 text-zinc-600 dark:bg-zinc-700/20 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50`;
      } else {
        return `${baseStyle} bg-blue-50/60 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/50`;
      }
    }

    // Fallback
    return `${baseStyle} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700`;
  };

  return <span className={`${getVariantStyles()} ${className}`}>{label}</span>;
}

export default PatternBadge;
