import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import LoginButton from "./components/LoginButton";
import Callback from "./components/callback";
import DeveloperDashboard from "./components/DeveloperDashboard";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <header className="bg-background p-4 border-b border-border">
          <div className="container mx-auto flex items-center justify-center relative">
            <h1
              className="text-xl font-bold"
              style={{
                background:
                  "radial-gradient(circle farthest-side at top right, var(--primary) 20%, #38B2AC 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              DevInsight
            </h1>
            <div className="absolute right-0">
              <LoginButton />
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 max-w-7xl">
          <Routes>
            <Route path="/" element={<DeveloperDashboard />} />
            <Route path="/callback" element={<Callback />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
