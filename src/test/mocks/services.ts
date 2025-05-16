import { vi } from "vitest";

// Mock localStorage
export function createLocalStorageMock() {
  const store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
}

// Mock cache service
export function setupCacheServiceMock() {
  vi.mock("../../lib/cacheService", () => ({
    default: {
      getPRAnalysis: vi.fn().mockResolvedValue(null),
      getPatternAnalysis: vi.fn().mockResolvedValue(null),
      cachePatternAnalysis: vi.fn().mockResolvedValue(undefined),
      clearAllPatternAnalysis: vi.fn().mockResolvedValue(undefined),
      clearAllPRAnalysis: vi.fn().mockResolvedValue(undefined),
    },
  }));
}

// Mock GitHub API/service
export function setupGitHubServiceMocks() {
  vi.mock("../../lib/github", () => ({
    GitHubAPI: {
      getUserProfile: vi.fn(),
    },
  }));

  vi.mock("../../lib/octokit-service", () => ({
    GitHubDevService: vi.fn().mockImplementation(() => ({
      getUserPRs: vi.fn().mockResolvedValue([]),
      getRepositoryData: vi.fn().mockResolvedValue({}),
    })),
  }));
}
