import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import LoginButton from "./components/LoginButton";
import Callback from "./components/callback";
import DeveloperDashboard from "./components/DeveloperDashboard";
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
            <Route path="/" element={<DeveloperDashboard />} />
            <Route path="/callback" element={<Callback />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
