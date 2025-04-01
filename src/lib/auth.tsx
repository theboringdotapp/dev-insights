import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { GitHubAPI } from "./github";

// GitHub user profile type
interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  // Add more specific properties as needed
  [key: string]: string | number | boolean | null | undefined;
}

// Define the auth context type
type AuthContextType = {
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  userProfile: GitHubUser | null;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("github_token")
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<GitHubUser | null>(null);

  // Check if token exists and fetch user profile on component mount
  useEffect(() => {
    const token = localStorage.getItem("github_token");
    if (token) {
      setAccessToken(token);
      fetchUserProfile(token);
    }
  }, []);

  // Fetch user profile to validate token and get user info
  const fetchUserProfile = async (token: string) => {
    setIsLoading(true);
    try {
      const userData = await GitHubAPI.getUserProfile(token);
      setUserProfile(userData as GitHubUser);
    } catch (error) {
      console.error("Failed to fetch user profile", error);
      // If token validation fails, clear it
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Login function - store token and fetch profile
  const login = (token: string) => {
    localStorage.setItem("github_token", token);
    setAccessToken(token);
    fetchUserProfile(token);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("github_token");
    setAccessToken(null);
    setUserProfile(null);
  };

  const value = {
    accessToken,
    login,
    logout,
    isAuthenticated: !!accessToken,
    isLoading,
    userProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
