import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import LoginButton from "./components/LoginButton";
import Callback from "./components/callback";
import DeveloperDashboard from "./components/DeveloperDashboard";
import { Toaster } from "sonner";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-background">
        <header className="bg-background p-4 border-b border-border">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold">GitHub Review Insights</h1>
            <LoginButton />
          </div>
        </header>
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/callback" element={<Callback />} />
            <Route path="/" element={<DeveloperDashboard />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
