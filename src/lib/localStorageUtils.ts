import { MetaAnalysisResult } from "./types";

// Constants for localStorage keys
export const DEVELOPER_ID_KEY = "github-review-developer-id";
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
 * Save the current developer ID to localStorage
 */
export function saveCurrentDeveloperToLocalStorage(developerId: string): void {
  try {
    // Only save valid developer IDs
    if (developerId && developerId !== "unknown") {
      localStorage.setItem(DEVELOPER_ID_KEY, developerId);
      console.log(
        `[LocalStorageBackup] Saved current developer ID: ${developerId}`
      );
    }
  } catch (e) {
    console.error("[LocalStorageBackup] Error saving developer ID:", e);
  }
}

/**
 * Load the developer ID from localStorage
 */
export function loadDeveloperIdFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(DEVELOPER_ID_KEY);
  } catch (e) {
    console.error(
      "[LocalStorageBackup] Error loading developer ID from localStorage:",
      e
    );
    return null;
  }
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
