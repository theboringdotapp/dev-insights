import { AuthProvider, useAuth } from "./lib/auth";
import { useState } from "react";
import DeveloperDashboard from "./components/DeveloperDashboard";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { DeveloperProvider } from "./contexts/DeveloperContext";
import { Github } from "lucide-react";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <DeveloperProvider>
        <AppContent />
      </DeveloperProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, userProfile, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-background p-4 border-b border-border sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            DevInsight
          </h1>
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors focus:outline-none cursor-pointer"
                aria-label="User menu"
                aria-expanded={showDropdown}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27"></path>
                </svg>

                {userProfile && (
                  <div className="flex items-center space-x-1 hidden md:flex">
                    <span className="text-sm">{userProfile.login}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-4 w-4 transition-transform ${
                        showDropdown ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card border border-border z-50">
                  <div className="py-1">
                    {userProfile && (
                      <div className="px-4 py-2 text-sm text-foreground border-b border-border">
                        Signed in as <strong>{userProfile.login}</strong>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 flex-grow">
        <Routes>
          <Route path="/" element={<DeveloperDashboard />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border mt-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">
                  <span className="footer-vibe-coded">vibecoded</span> by{" "}
                  <a
                    href="https://theboring.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    theboring.app
                  </a>
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Freemium tools for improving your everyday life
              </p>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex space-x-4">
                <a
                  href="/privacy-policy.html"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
                <a
                  href="https://github.com/carbonaut/github-review"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Source Code
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;
