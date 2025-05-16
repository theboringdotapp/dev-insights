import { MetaAnalysisResult } from "./types";

// Constants for localStorage keys
// Removed DEVELOPER_ID_KEY as we'll no longer store developer ID directly
export const LAST_PATTERN_RESULT_KEY = "github-review-pattern-result";

/**
 * Interface for cached meta analysis result with timestamp and developer info
 */
export interface CachedMetaAnalysisResult extends MetaAnalysisResult {
  timestamp?: number;
  analyzedPRIds?: number[];
  developerId?: string;
}

/**
 * Save the pattern analysis result to localStorage
 */
export function savePatternResultToLocalStorage(
  pattern: CachedMetaAnalysisResult
): void {
  try {
    localStorage.setItem(LAST_PATTERN_RESULT_KEY, JSON.stringify(pattern));
    console.log(
      "[LocalStorageBackup] Saved last pattern result to localStorage"
    );
  } catch (e) {
    console.error("[LocalStorageBackup] Error saving pattern result:", e);
  }
}

/**
 * Load pattern analysis result from localStorage
 */
export function loadPatternResultFromLocalStorage(): CachedMetaAnalysisResult | null {
  try {
    const savedPattern = localStorage.getItem(LAST_PATTERN_RESULT_KEY);
    if (savedPattern) {
      return JSON.parse(savedPattern);
    }
    return null;
  } catch (e) {
    console.error("[LocalStorageBackup] Error loading pattern result:", e);
    return null;
  }
}
