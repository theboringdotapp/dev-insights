import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Interface for context value
interface DeveloperContextValue {
  developerId: string;
  setDeveloperId: (id: string) => void;
}

// Create context with default values
const DeveloperContext = createContext<DeveloperContextValue>({
  developerId: "",
  setDeveloperId: () => {},
});

// Provider component
interface DeveloperProviderProps {
  children: ReactNode;
}

export function DeveloperProvider({ children }: DeveloperProviderProps) {
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();

  // Initialize from URL or authenticated user
  const initialDeveloperId =
    searchParams.get("username") || userProfile?.login || "";
  const [developerId, setDeveloperIdState] = useState(initialDeveloperId);

  // Update developerId when URL or user profile changes
  useEffect(() => {
    const urlUsername = searchParams.get("username");
    if (urlUsername) {
      setDeveloperIdState(urlUsername);
    } else if (!developerId && userProfile?.login) {
      setDeveloperIdState(userProfile.login);
    }
  }, [searchParams, userProfile, developerId]);

  // Custom setter that also logs changes
  const setDeveloperId = (id: string) => {
    console.log(`[DeveloperContext] Setting developer ID: ${id}`);
    setDeveloperIdState(id);
  };

  const value = {
    developerId,
    setDeveloperId,
  };

  return (
    <DeveloperContext.Provider value={value}>
      {children}
    </DeveloperContext.Provider>
  );
}

// Custom hook for using this context
export function useDeveloperContext() {
  const context = useContext(DeveloperContext);
  if (!context) {
    throw new Error(
      "useDeveloperContext must be used within a DeveloperProvider"
    );
  }
  return context;
}
