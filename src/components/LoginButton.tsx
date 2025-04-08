import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function LoginButton() {
  const { login, logout, isAuthenticated, userProfile } = useAuth();
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [token, setToken] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      login(token);
      setToken("");
      setShowTokenInput(false);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  if (isAuthenticated) {
    return (
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors focus:outline-none cursor-pointer"
          aria-label="User menu"
          aria-expanded={showDropdown}
        >
          {/* GitHub Icon */}
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
              {/* Dropdown Caret */}
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

        {/* Dropdown menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card border border-border z-10">
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
    );
  }

  if (showTokenInput) {
    return (
      <form onSubmit={handleLogin} className="flex flex-col gap-2">
        <div>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your GitHub token"
            className="px-3 py-2 border border-input bg-background rounded-md w-full"
            autoFocus
          />
        </div>
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowTokenInput(false)}
            className="px-3 py-1 border border-input bg-background rounded-md hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Login
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      onClick={() => setShowTokenInput(true)}
      className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
    >
      {/* GitHub Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 mr-2"
      >
        <path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27"></path>
      </svg>
      Login with GitHub
    </button>
  );
}
