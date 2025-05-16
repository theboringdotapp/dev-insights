import { vi } from "vitest";
import { GitHubUser } from "../../lib/types";
import React from "react";

// Mock auth service
export const mockAuthUser: GitHubUser = {
  login: "testuser",
  id: 123456,
  avatar_url: "https://github.com/testuser.png",
  name: "Test User",
  email: "test@example.com",
};

export const mockAuthContext = {
  accessToken: "test-token",
  login: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
  userProfile: mockAuthUser,
};

export function setupAuthMock() {
  // Create a mock AuthContext and Provider
  const mockAuthContextValue = mockAuthContext;

  // Mock the auth module
  vi.mock("../../lib/auth", () => {
    // Import the actual context
    const actual = vi.importActual("../../lib/auth");

    return {
      // Keep any other exports from the original module
      ...actual,
      // But override useAuth and AuthProvider
      useAuth: () => mockAuthContextValue,
      // Mock the AuthProvider to just render children
      AuthProvider: ({ children }) => children,
    };
  });
}

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
