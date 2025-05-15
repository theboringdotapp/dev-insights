import { PRAnalysisResult, MetaAnalysisResult } from "./types";

// IndexedDB constants
const DB_NAME = "github-review-cache";
const DB_VERSION = 3; // Incremented version to handle new schema with composite key
const PR_ANALYSIS_STORE = "pr-analysis";
const PATTERN_ANALYSIS_STORE = "pattern-analysis";

// Debug flag - set to true for verbose logging
const DEBUG = true;

// Connection pool to avoid repeatedly opening the database
let dbConnectionPromise: Promise<IDBDatabase> | null = null;

// Locks to prevent concurrent access to the same resources
const operationLocks: Record<string, boolean> = {};

// Helper to get/create a lock for a specific operation
function getLock(key: string): boolean {
  if (operationLocks[key]) {
    if (DEBUG)
      console.log(
        `[CacheService] Operation in progress for ${key}, skipping duplicate`
      );
    return false;
  }

  operationLocks[key] = true;
  return true;
}

// Helper to release a lock
function releaseLock(key: string): void {
  operationLocks[key] = false;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number; // Optional expiration timestamp
}

/**
 * Initialize the IndexedDB database with connection pooling
 */
async function initializeDB(): Promise<IDBDatabase> {
  // If we already have a connection promise, return it
  if (dbConnectionPromise) {
    try {
      return await dbConnectionPromise;
    } catch (e) {
      console.warn(
        "[CacheService] Connection pool error, creating new connection:",
        e
      );
      dbConnectionPromise = null; // Reset and try again
    }
  }

  // Create a new connection promise
  dbConnectionPromise = new Promise((resolve, reject) => {
    try {
      if (DEBUG)
        console.log(
          `[CacheService] Opening IndexedDB database: ${DB_NAME} (version ${DB_VERSION})`
        );
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        dbConnectionPromise = null; // Reset the pool on error
        reject("Failed to open database");
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (DEBUG) console.log(`[CacheService] Successfully opened database`);

        // Set up error handling for the connection
        db.onerror = (event) => {
          console.error("[CacheService] Database error:", event);
          dbConnectionPromise = null; // Reset the pool on connection error
        };

        // Set up connection close handler
        db.onclose = () => {
          console.log("[CacheService] Database connection closed");
          dbConnectionPromise = null; // Reset the pool when connection closes
        };

        // Set up version change handler
        db.onversionchange = () => {
          console.log(
            "[CacheService] Database version change, closing connection"
          );
          db.close();
          dbConnectionPromise = null; // Reset the pool on version change
        };

        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        if (DEBUG)
          console.log(
            `[CacheService] Database upgrade needed: ${oldVersion} -> ${DB_VERSION}`
          );

        // Handle PR analysis store upgrade for version 3 (adding developerId to key)
        if (oldVersion < 3) {
          // If we're upgrading to version 3 and the store exists, delete it to recreate with new schema
          if (db.objectStoreNames.contains(PR_ANALYSIS_STORE)) {
            if (DEBUG)
              console.log(
                `[CacheService] Deleting old PR analysis store for schema upgrade`
              );
            db.deleteObjectStore(PR_ANALYSIS_STORE);
          }

          if (DEBUG)
            console.log(
              `[CacheService] Creating PR analysis store with composite key`
            );
          const store = db.createObjectStore(PR_ANALYSIS_STORE, {
            keyPath: ["developerId", "prId"],
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("developerId", "developerId", { unique: false });
        }
        // For version 1-2, create the store if it doesn't exist yet
        else if (!db.objectStoreNames.contains(PR_ANALYSIS_STORE)) {
          if (DEBUG)
            console.log(
              `[CacheService] Creating object store: ${PR_ANALYSIS_STORE}`
            );
          const store = db.createObjectStore(PR_ANALYSIS_STORE, {
            keyPath: "prId",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Create object store for pattern analysis results (in version 2)
        if (
          oldVersion < 2 &&
          !db.objectStoreNames.contains(PATTERN_ANALYSIS_STORE)
        ) {
          if (DEBUG)
            console.log(
              `[CacheService] Creating object store: ${PATTERN_ANALYSIS_STORE}`
            );
          const patternStore = db.createObjectStore(PATTERN_ANALYSIS_STORE, {
            keyPath: "developerId",
          });
          patternStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    } catch (error) {
      console.error("Error initializing IndexedDB:", error);
      reject(error);
    }
  });
}

/**
 * Cache service for storing and retrieving PR analysis and pattern results
 */
export const cacheService = {
  /**
   * Store PR analysis result in IndexedDB
   */
  async cachePRAnalysis(
    result: PRAnalysisResult,
    developerId: string,
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

      store.put({ prId: result.prId, developerId, ...entry });

      return new Promise((resolve) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
          console.error("Error caching PR analysis:", event);
        };
      });
    } catch (error) {
      console.error("Cache error:", error);
      // Fall back to localStorage if IndexedDB fails
      this.cachePRAnalysisToLocalStorage(result, developerId, expiryDays);
    }
  },

  /**
   * Retrieve PR analysis result from IndexedDB
   */
  async getPRAnalysis(
    prId: number,
    developerId: string
  ): Promise<PRAnalysisResult | null> {
    // Create unique key for this operation
    const opKey = `getPR-${developerId}-${prId}`;

    // Skip if this exact operation is already in progress
    if (!getLock(opKey)) {
      console.log(
        `[CacheService] Skipping duplicate request for PR ${prId} (${developerId})`
      );
      return null;
    }

    try {
      const db = await initializeDB();
      const transaction = db.transaction(PR_ANALYSIS_STORE, "readonly");
      const store = transaction.objectStore(PR_ANALYSIS_STORE);
      const request = store.get([developerId, prId]);

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
            this.deletePRAnalysis(prId, developerId);
            resolve(null);
            return;
          }

          resolve(entry.data);
        };

        request.onerror = (event) => {
          console.error("Error retrieving PR analysis:", event);
          // Try localStorage as fallback
          const fallbackResult = this.getPRAnalysisFromLocalStorage(
            prId,
            developerId
          );
          resolve(fallbackResult);
        };
      });
    } catch (error) {
      console.error("Cache retrieval error:", error);
      // Fall back to localStorage
      return this.getPRAnalysisFromLocalStorage(prId, developerId);
    } finally {
      // Always release the lock when done
      releaseLock(opKey);
    }
  },

  /**
   * Delete PR analysis result from cache
   */
  async deletePRAnalysis(prId: number, developerId: string): Promise<void> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction(PR_ANALYSIS_STORE, "readwrite");
      const store = transaction.objectStore(PR_ANALYSIS_STORE);
      store.delete([developerId, prId]);

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
      this.deletePRAnalysisFromLocalStorage(prId, developerId);
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
    developerId: string,
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

      localStorage.setItem(
        `pr-analysis-${result.prId}-${developerId}`,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error("LocalStorage cache error:", error);
    }
  },

  getPRAnalysisFromLocalStorage(
    prId: number,
    developerId: string
  ): PRAnalysisResult | null {
    try {
      const entryStr = localStorage.getItem(
        `pr-analysis-${prId}-${developerId}`
      );
      if (!entryStr) return null;

      const entry = JSON.parse(entryStr) as CacheEntry<PRAnalysisResult>;

      // Check if entry is expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        // Entry expired, delete it
        this.deletePRAnalysis(prId, developerId);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error("LocalStorage retrieval error:", error);
      return null;
    }
  },

  deletePRAnalysisFromLocalStorage(prId: number, developerId: string): void {
    try {
      localStorage.removeItem(`pr-analysis-${prId}-${developerId}`);
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

  /**
   * Store pattern analysis result in IndexedDB, keyed by developer ID
   */
  async cachePatternAnalysis(
    developerId: string,
    result: MetaAnalysisResult,
    expiryDays = 7
  ): Promise<void> {
    if (!developerId || developerId === "undefined" || developerId === "null") {
      console.error(
        "Invalid developer ID provided to cachePatternAnalysis:",
        developerId
      );
      return;
    }

    if (DEBUG)
      console.log(
        `[CacheService] Caching pattern analysis for developer: ${developerId}`,
        result
      );

    try {
      const db = await initializeDB();
      const transaction = db.transaction(PATTERN_ANALYSIS_STORE, "readwrite");
      const store = transaction.objectStore(PATTERN_ANALYSIS_STORE);

      const timestamp = Date.now();
      const expiresAt =
        expiryDays > 0
          ? timestamp + expiryDays * 24 * 60 * 60 * 1000
          : undefined;

      const entry: CacheEntry<MetaAnalysisResult> = {
        data: result,
        timestamp,
        expiresAt,
      };

      const request = store.put({ developerId, ...entry });

      request.onsuccess = () => {
        if (DEBUG)
          console.log(
            `[CacheService] Successfully stored pattern for developer: ${developerId}`
          );
      };

      request.onerror = (event) => {
        console.error(
          `[CacheService] Error in IndexedDB put operation:`,
          event
        );
      };

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          if (DEBUG)
            console.log(`[CacheService] Transaction completed successfully`);
          resolve();
        };
        transaction.onerror = (event) => {
          console.error("Error caching pattern analysis:", event);
          reject(event);
        };
      });
    } catch (error) {
      console.error("Pattern cache error:", error);
      // Fall back to localStorage
      this.cachePatternAnalysisToLocalStorage(developerId, result, expiryDays);
    }
  },

  /**
   * Retrieve pattern analysis result from IndexedDB by developer ID
   */
  async getPatternAnalysis(
    developerId: string
  ): Promise<MetaAnalysisResult | null> {
    if (!developerId || developerId === "undefined" || developerId === "null") {
      console.error(
        "Invalid developer ID provided to getPatternAnalysis:",
        developerId
      );
      return null;
    }

    // Create unique key for this operation
    const opKey = `getPattern-${developerId}`;

    // Skip if this exact operation is already in progress
    if (!getLock(opKey)) {
      console.log(
        `[CacheService] Skipping duplicate pattern request for ${developerId}`
      );
      return null;
    }

    try {
      if (DEBUG)
        console.log(
          `[CacheService] Retrieving pattern analysis for developer: ${developerId}`
        );

      const db = await initializeDB();
      const transaction = db.transaction(PATTERN_ANALYSIS_STORE, "readonly");
      const store = transaction.objectStore(PATTERN_ANALYSIS_STORE);
      const request = store.get(developerId);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entry = request.result as
            | CacheEntry<MetaAnalysisResult>
            | undefined;

          if (DEBUG)
            console.log(
              `[CacheService] IndexedDB lookup result for ${developerId}:`,
              entry
            );

          if (!entry) {
            if (DEBUG)
              console.log(
                `[CacheService] No pattern found in IndexedDB for developer: ${developerId}`
              );
            resolve(null);
            return;
          }

          // Check if entry is expired
          if (entry.expiresAt && entry.expiresAt < Date.now()) {
            if (DEBUG)
              console.log(
                `[CacheService] Pattern for developer ${developerId} is expired`
              );
            // Entry expired, delete it
            this.deletePatternAnalysis(developerId);
            resolve(null);
            return;
          }

          if (DEBUG)
            console.log(
              `[CacheService] Successfully retrieved pattern for developer: ${developerId}`,
              entry.data
            );
          resolve(entry.data);
        };

        request.onerror = (event) => {
          console.error("Error retrieving pattern analysis:", event);
          // Try localStorage as fallback
          if (DEBUG)
            console.log(
              `[CacheService] Trying localStorage fallback for developer: ${developerId}`
            );
          const fallbackResult =
            this.getPatternAnalysisFromLocalStorage(developerId);
          resolve(fallbackResult);
        };
      });
    } catch (error) {
      console.error("Pattern cache retrieval error:", error);
      // Fall back to localStorage
      if (DEBUG)
        console.log(
          `[CacheService] Error in IndexedDB retrieval, trying localStorage fallback`
        );
      return this.getPatternAnalysisFromLocalStorage(developerId);
    } finally {
      // Always release the lock when done
      releaseLock(opKey);
    }
  },

  /**
   * Delete pattern analysis result from cache by developer ID
   */
  async deletePatternAnalysis(developerId: string): Promise<void> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction(PATTERN_ANALYSIS_STORE, "readwrite");
      const store = transaction.objectStore(PATTERN_ANALYSIS_STORE);
      store.delete(developerId);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
          console.error("Error deleting pattern analysis:", event);
          reject("Failed to delete pattern analysis");
        };
      });
    } catch (error) {
      console.error("Delete pattern error:", error);
      // Also remove from localStorage
      this.deletePatternAnalysisFromLocalStorage(developerId);
    }
  },

  /**
   * Clear all cached pattern analysis results
   */
  async clearAllPatternAnalysis(): Promise<void> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction(PATTERN_ANALYSIS_STORE, "readwrite");
      const store = transaction.objectStore(PATTERN_ANALYSIS_STORE);
      store.clear();

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          // Also clear localStorage
          this.clearAllPatternAnalysisFromLocalStorage();
          resolve();
        };
        transaction.onerror = (event) => {
          console.error("Error clearing pattern analysis cache:", event);
          reject("Failed to clear pattern analysis cache");
        };
      });
    } catch (error) {
      console.error("Clear pattern cache error:", error);
      // Clear localStorage as fallback
      this.clearAllPatternAnalysisFromLocalStorage();
    }
  },

  // LocalStorage fallback methods for pattern analysis
  cachePatternAnalysisToLocalStorage(
    developerId: string,
    result: MetaAnalysisResult,
    expiryDays = 7
  ): void {
    if (!developerId || developerId === "undefined" || developerId === "null") {
      console.error(
        "Invalid developer ID provided to cachePatternAnalysisToLocalStorage:",
        developerId
      );
      return;
    }

    if (DEBUG)
      console.log(
        `[CacheService] Caching pattern analysis to localStorage for developer: ${developerId}`
      );

    try {
      const timestamp = Date.now();
      const expiresAt =
        expiryDays > 0
          ? timestamp + expiryDays * 24 * 60 * 60 * 1000
          : undefined;

      const entry: CacheEntry<MetaAnalysisResult> = {
        data: result,
        timestamp,
        expiresAt,
      };

      const key = `pattern-analysis-${developerId}`;
      const value = JSON.stringify(entry);

      localStorage.setItem(key, value);

      if (DEBUG) {
        console.log(
          `[CacheService] Successfully stored pattern in localStorage with key: ${key}`
        );
        // Verify it was stored
        const storedItem = localStorage.getItem(key);
        console.log(
          `[CacheService] Verification - Retrieved item from localStorage:`,
          storedItem ? "Success" : "Failed"
        );
      }
    } catch (error) {
      console.error("LocalStorage pattern cache error:", error);
    }
  },

  getPatternAnalysisFromLocalStorage(
    developerId: string
  ): MetaAnalysisResult | null {
    if (!developerId || developerId === "undefined" || developerId === "null") {
      console.error(
        "Invalid developer ID provided to getPatternAnalysisFromLocalStorage:",
        developerId
      );
      return null;
    }

    if (DEBUG)
      console.log(
        `[CacheService] Retrieving pattern analysis from localStorage for developer: ${developerId}`
      );

    try {
      const key = `pattern-analysis-${developerId}`;
      const entryStr = localStorage.getItem(key);

      if (DEBUG)
        console.log(
          `[CacheService] LocalStorage lookup for key ${key}:`,
          entryStr ? "Found" : "Not found"
        );

      if (!entryStr) return null;

      const entry = JSON.parse(entryStr) as CacheEntry<MetaAnalysisResult>;

      if (DEBUG)
        console.log(`[CacheService] Parsed entry from localStorage:`, entry);

      // Check if entry is expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        if (DEBUG)
          console.log(
            `[CacheService] Pattern in localStorage for developer ${developerId} is expired`
          );
        // Entry expired, delete it
        this.deletePatternAnalysis(developerId);
        return null;
      }

      if (DEBUG)
        console.log(
          `[CacheService] Successfully retrieved pattern from localStorage for developer: ${developerId}`,
          entry.data
        );
      return entry.data;
    } catch (error) {
      console.error("LocalStorage pattern retrieval error:", error);
      return null;
    }
  },

  deletePatternAnalysisFromLocalStorage(developerId: string): void {
    try {
      localStorage.removeItem(`pattern-analysis-${developerId}`);
    } catch (error) {
      console.error("LocalStorage pattern delete error:", error);
    }
  },

  clearAllPatternAnalysisFromLocalStorage(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("pattern-analysis-")) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("LocalStorage pattern clear error:", error);
    }
  },
};

export default cacheService;
