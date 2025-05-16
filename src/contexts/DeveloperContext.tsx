import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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

  // Keep track of previous ID to detect actual changes
  const prevIdRef = useRef<string>("");

  // Initialize from URL or authenticated user
  const initialDeveloperId =
    searchParams.get("username") || userProfile?.login || "";
  const [developerId, setDeveloperIdState] = useState(initialDeveloperId);

  // Only set from userProfile if we don't have any other source
  useEffect(() => {
    if (!developerId && userProfile?.login) {
      console.log(
        `[DeveloperContext] Setting initial developer ID from user profile: ${userProfile.login}`
      );
      setDeveloperIdState(userProfile.login);
    }
  }, [userProfile, developerId]);

  // Custom setter that also logs changes and prevents redundant updates
  const setDeveloperId = (id: string) => {
    // Skip if the ID isn't actually changing
    if (id === developerId) {
      console.log(
        `[DeveloperContext] Skipping redundant update to same ID: ${id}`
      );
      return;
    }

    // Update previous ID ref
    prevIdRef.current = developerId;

    console.log(
      `[DeveloperContext] Setting developer ID: ${id} (previous: ${prevIdRef.current})`
    );
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
