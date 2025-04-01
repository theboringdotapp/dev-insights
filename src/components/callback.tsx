import { useEffect } from "react";
import { useAuth } from "../lib/auth";

export default function Callback() {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // If authentication is complete and not loading, redirect to home
    if (!isLoading && isAuthenticated) {
      window.location.href = "/";
    }
  }, [isLoading, isAuthenticated]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Authenticating with GitHub...</h1>
      {isLoading && (
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      )}
    </div>
  );
}
