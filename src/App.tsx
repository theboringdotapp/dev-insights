import { Github } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import { DeveloperProvider } from "./contexts/DeveloperContext";
import { AuthProvider, useAuth } from "./lib/auth";

// Lazy load main components
const DeveloperDashboard = lazy(
  () => import("./components/DeveloperDashboard")
);

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center h-[80vh]">
    <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
  </div>
);

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
    <div className="flex flex-col min-h-screen w-full">
      {/* Header - removed sticky positioning */}
      <header className="w-full bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a
                href="/"
                className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
              >
                <span className="font-semibold text-xl text-purple-600">
                  Developer Insights
                </span>
              </a>
            </div>
            {isAuthenticated ? (
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
                  <span className="text-sm font-medium">
                    {userProfile?.login}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 ml-1"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <button
                      onClick={() => {
                        logout();
                        setShowDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="#login"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                <Github className="mr-2 h-4 w-4" />
                Login with GitHub
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<DeveloperDashboard />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  href="https://github.com/theboringdotapp/dev-insights"
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
    </div>
  );
}

export default App;
