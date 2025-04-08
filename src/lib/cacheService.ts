import { PRAnalysisResult } from "./types";

// IndexedDB constants
const DB_NAME = "github-review-cache";
const DB_VERSION = 1;
const PR_ANALYSIS_STORE = "pr-analysis";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number; // Optional expiration timestamp
}

/**
 * Initialize the IndexedDB database
 */
async function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Failed to open database");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for PR analysis results
      if (!db.objectStoreNames.contains(PR_ANALYSIS_STORE)) {
        const store = db.createObjectStore(PR_ANALYSIS_STORE, {
          keyPath: "prId",
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

/**
 * Cache service for storing and retrieving PR analysis results
 */
export const cacheService = {
  /**
   * Store PR analysis result in IndexedDB
   */
  async cachePRAnalysis(
    result: PRAnalysisResult,
    expiryDays = 30
  ): Promise<void> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction(PR_ANALYSIS_STORE, "readwrite");
      const store = transaction.objectStore(PR_ANALYSIS_STORE);

      const timestamp = Date.now();
      const expiresAt =
        expiryDays > 0
          ? timestamp + expiryDays * 24 * 60 * 60 * 1000
          : undefined;

      const entry: CacheEntry<PRAnalysisResult> = {
        data: result,
        timestamp,
        expiresAt,
      };

      store.put({ prId: result.prId, ...entry });

      return new Promise((resolve) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
          console.error("Error caching PR analysis:", event);
        };
      });
    } catch (error) {
      console.error("Cache error:", error);
      // Fall back to localStorage if IndexedDB fails
      this.cachePRAnalysisToLocalStorage(result, expiryDays);
    }
  },

  /**
   * Retrieve PR analysis result from IndexedDB
   */
  async getPRAnalysis(prId: number): Promise<PRAnalysisResult | null> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction(PR_ANALYSIS_STORE, "readonly");
      const store = transaction.objectStore(PR_ANALYSIS_STORE);
      const request = store.get(prId);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entry = request.result as
            | CacheEntry<PRAnalysisResult>
            | undefined;

          if (!entry) {
            resolve(null);
            return;
          }

          // Check if entry is expired
          if (entry.expiresAt && entry.expiresAt < Date.now()) {
            // Entry expired, delete it
            this.deletePRAnalysis(prId);
            resolve(null);
            return;
          }

          resolve(entry.data);
        };

        request.onerror = (event) => {
          console.error("Error retrieving PR analysis:", event);
          // Try localStorage as fallback
          const fallbackResult = this.getPRAnalysisFromLocalStorage(prId);
          resolve(fallbackResult);
        };
      });
    } catch (error) {
      console.error("Cache retrieval error:", error);
      // Fall back to localStorage
      return this.getPRAnalysisFromLocalStorage(prId);
    }
  },

  /**
   * Delete PR analysis result from cache
   */
  async deletePRAnalysis(prId: number): Promise<void> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction(PR_ANALYSIS_STORE, "readwrite");
      const store = transaction.objectStore(PR_ANALYSIS_STORE);
      store.delete(prId);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
          console.error("Error deleting PR analysis:", event);
          reject("Failed to delete PR analysis");
        };
      });
    } catch (error) {
      console.error("Delete error:", error);
      // Also remove from localStorage
      this.deletePRAnalysisFromLocalStorage(prId);
    }
  },

  /**
   * Clear all cached PR analysis results
   */
  async clearAllPRAnalysis(): Promise<void> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction(PR_ANALYSIS_STORE, "readwrite");
      const store = transaction.objectStore(PR_ANALYSIS_STORE);
      store.clear();

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          // Also clear localStorage
          this.clearAllPRAnalysisFromLocalStorage();
          resolve();
        };
        transaction.onerror = (event) => {
          console.error("Error clearing PR analysis cache:", event);
          reject("Failed to clear PR analysis cache");
        };
      });
    } catch (error) {
      console.error("Clear cache error:", error);
      // Clear localStorage as fallback
      this.clearAllPRAnalysisFromLocalStorage();
    }
  },

  // LocalStorage fallback methods
  cachePRAnalysisToLocalStorage(
    result: PRAnalysisResult,
    expiryDays = 30
  ): void {
    try {
      const timestamp = Date.now();
      const expiresAt =
        expiryDays > 0
          ? timestamp + expiryDays * 24 * 60 * 60 * 1000
          : undefined;

      const entry: CacheEntry<PRAnalysisResult> = {
        data: result,
        timestamp,
        expiresAt,
      };

      localStorage.setItem(`pr-analysis-${result.prId}`, JSON.stringify(entry));
    } catch (error) {
      console.error("LocalStorage cache error:", error);
    }
  },

  getPRAnalysisFromLocalStorage(prId: number): PRAnalysisResult | null {
    try {
      const entryStr = localStorage.getItem(`pr-analysis-${prId}`);
      if (!entryStr) return null;

      const entry = JSON.parse(entryStr) as CacheEntry<PRAnalysisResult>;

      // Check if entry is expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        // Entry expired, delete it
        this.deletePRAnalysisFromLocalStorage(prId);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error("LocalStorage retrieval error:", error);
      return null;
    }
  },

  deletePRAnalysisFromLocalStorage(prId: number): void {
    try {
      localStorage.removeItem(`pr-analysis-${prId}`);
    } catch (error) {
      console.error("LocalStorage delete error:", error);
    }
  },

  clearAllPRAnalysisFromLocalStorage(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("pr-analysis-")) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("LocalStorage clear error:", error);
    }
  },
};

export default cacheService;
