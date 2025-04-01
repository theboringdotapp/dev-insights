import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { GitHubAPI, GitHubRepository } from "./lib/github";
import LoginButton from "./components/LoginButton";
import Callback from "./components/callback";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">
              Developer Performance Dashboard
            </h1>
            <LoginButton />
          </div>
        </header>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/callback" element={<Callback />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

// Dashboard component showing GitHub repos
function Dashboard() {
  const { accessToken, isAuthenticated } = useAuth();
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch repos when authenticated
  useEffect(() => {
    async function fetchRepos() {
      if (isAuthenticated && accessToken) {
        try {
          setLoading(true);
          const repoData = await GitHubAPI.getUserRepos(accessToken);
          setRepos(repoData);
        } catch (error) {
          console.error("Error fetching repos:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchRepos();
  }, [isAuthenticated, accessToken]);

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">
          Welcome to Developer Dashboard
        </h2>
        <p className="text-gray-600">
          This dashboard will show metrics and insights about your GitHub
          repositories. Please log in with your GitHub Personal Access Token to
          view your data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Your GitHub Repositories</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-bold text-lg">{repo.name}</h3>
              <p className="text-sm text-gray-600 mb-2">
                {repo.description || "No description"}
              </p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>⭐ {repo.stargazers_count}</span>
                <span>🍴 {repo.forks_count}</span>
                <span>
                  Updated: {new Date(repo.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {repos.length === 0 && (
            <p className="col-span-3 text-center text-gray-500">
              No repositories found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
