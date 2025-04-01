import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function LoginButton() {
  const { login, logout, isAuthenticated, userProfile } = useAuth();
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [token, setToken] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      login(token);
      setToken("");
      setShowTokenInput(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-end gap-2">
        {userProfile && (
          <div className="text-sm">
            Logged in as <strong>{userProfile.login}</strong>
          </div>
        )}
        <button
          onClick={logout}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Logout
        </button>
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
            className="px-3 py-2 border border-gray-300 rounded-md w-full"
            autoFocus
          />
        </div>
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowTokenInput(false)}
            className="px-3 py-1 border border-gray-300 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
      className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
    >
      Login with GitHub Token
    </button>
  );
}
