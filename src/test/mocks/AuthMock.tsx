import React, { createContext, ReactNode } from "react";
import { GitHubUser } from "../../lib/types";
import { vi } from "vitest";

// Create mock user
const mockUser: GitHubUser = {
  login: "testuser",
  id: 123456,
  avatar_url: "https://github.com/testuser.png",
  name: "Test User",
  email: "test@example.com",
};

// Mock auth context type (this should match the original in auth.tsx)
type AuthContextType = {
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  userProfile: GitHubUser | null;
};

// Create a mock context with default values
const mockAuthContext = createContext<AuthContextType>({
  accessToken: "test-token",
  login: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
  userProfile: mockUser,
});

// Export a simple mock provider component
export const MockAuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Mock auth value
  const mockValue: AuthContextType = {
    accessToken: "test-token",
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
    userProfile: mockUser,
  };

  return (
    <mockAuthContext.Provider value={mockValue}>
      {children}
    </mockAuthContext.Provider>
  );
};
