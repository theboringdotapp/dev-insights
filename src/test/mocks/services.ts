import { vi } from "vitest";
import { GitHubUser } from "../../lib/types";

// Mock auth service
const mockAuthUser: GitHubUser = {
  login: "testuser",
  id: 123456,
  avatar_url: "https://github.com/testuser.png",
  name: "Test User",
  email: "test@example.com",
};

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
      getPRAnalysis: vi.fn(),
      getPatternAnalysis: vi.fn(),
      cachePatternAnalysis: vi.fn(),
      clearAllPatternAnalysis: vi.fn(),
      clearAllPRAnalysis: vi.fn(),
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
