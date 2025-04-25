import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, LogIn } from "lucide-react";
import { useAuth } from "../lib/auth";

function UnauthenticatedView(): React.ReactElement {
  const { login } = useAuth();
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

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)] bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-lg text-center shadow-lg border-0">
        <CardHeader className="p-8 pb-4">
          <div className="mx-auto mb-5 p-3 rounded-full bg-primary/10 text-primary w-fit">
            <LogIn size={36} strokeWidth={2} />
          </div>
          <CardTitle className="text-3xl font-bold">
            Welcome to DevInsight
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground pt-2">
            Connect your GitHub account to unlock performance analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          {!showTokenInput ? (
            <div className="space-y-6 pt-4">
              <Button
                className="w-full cursor-pointer py-3 text-lg"
                onClick={() => setShowTokenInput(true)}
              >
                <Github className="mr-2.5 h-5 w-5" /> Connect with GitHub
              </Button>
              <p className="text-sm text-muted-foreground px-4">
                We use your GitHub token to fetch repository data and analyze
                contributions.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6 pt-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="github-token">
                  GitHub Personal Access Token
                </Label>
                <Input
                  id="github-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your token here (e.g., ghp_...)"
                  className="w-full py-2"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTokenInput(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Login</Button>
              </div>
              <p className="text-xs text-muted-foreground px-1 pt-2 text-center">
                Ensure your token has `repo` and `read:user` permissions.{" "}
                <a
                  href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  Need help creating a token?
                </a>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UnauthenticatedView;
