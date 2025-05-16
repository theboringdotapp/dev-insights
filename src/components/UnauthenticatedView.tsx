import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Github,
  LogIn,
  Code,
  Lock,
  Activity,
  BookOpenCheck,
  Lightbulb,
  TrendingUp,
  BookOpen,
  BarChart,
  FileCode2,
  Users2,
} from "lucide-react";
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

  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-background px-4 py-16">
      {/* Header */}
      <motion.div
        className="text-center max-w-2xl mx-auto mb-10"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeIn} className="inline-flex items-center mb-4">
          <span className="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 text-xs font-medium px-3 py-1 rounded-full">
            Free & Open Source
          </span>
        </motion.div>

        <motion.h1
          variants={fadeIn}
          className="text-4xl md:text-5xl font-bold text-purple-600 dark:text-purple-400 mb-4"
        >
          DevInsight
        </motion.h1>

        <motion.p
          variants={fadeIn}
          className="text-zinc-700 dark:text-zinc-300 text-xl mb-8 max-w-lg mx-auto"
        >
          Analyze your GitHub activity and improve your development workflow
          with powerful insights and metrics.
        </motion.p>
      </motion.div>

      {/* Main content */}
      <motion.div
        className="flex flex-col md:flex-row items-center justify-center w-full max-w-6xl gap-8 mb-16"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Left side - Login Card (swapped positions) */}
        <motion.div variants={fadeIn} className="w-full md:w-1/2 max-w-md">
          <div className="bg-card p-8 rounded-2xl shadow-lg border border-border">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 w-fit">
                <LogIn size={28} strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-foreground">
                Get Started
              </h2>
              <p className="text-muted-foreground">
                Sign in with your GitHub account to analyze your developer
                metrics
              </p>
            </div>

            {!showTokenInput ? (
              <div className="space-y-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center font-medium"
                  onClick={() => setShowTokenInput(true)}
                >
                  <Github className="mr-2.5 h-5 w-5" /> Connect with GitHub
                </motion.button>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                  We use your GitHub token to fetch repository data and analyze
                  contributions.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="github-token"
                    className="block text-sm font-medium text-foreground text-left"
                  >
                    GitHub Personal Access Token
                  </label>
                  <input
                    id="github-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your token here (e.g., ghp_...)"
                    className="w-full px-4 py-3 border border-input bg-muted rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-accent transition-colors text-sm font-medium"
                    onClick={() => setShowTokenInput(false)}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Login
                  </motion.button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 text-center">
                  Ensure your token has `repo` and `read:user` permissions.{" "}
                  <a
                    href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Need help creating a token?
                  </a>
                </p>
              </form>
            )}
          </div>
        </motion.div>

        {/* Right side - Dashboard Preview (swapped positions and improved) */}
        <motion.div
          variants={fadeIn}
          className="w-full md:w-1/2 max-w-lg bg-card rounded-2xl shadow-lg border border-border overflow-hidden"
        >
          {/* Dashboard header with window controls */}
          <div className="flex items-center bg-muted px-4 py-2 border-b border-border">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-500"></div>
            </div>
            <div className="mx-auto text-sm text-zinc-500 dark:text-zinc-400">
              Developer Dashboard
            </div>
          </div>

          {/* Dashboard content preview */}
          <div className="p-4 h-[400px] bg-gradient-to-br from-purple-50/40 to-white dark:from-purple-900/20 dark:to-zinc-900/30">
            {/* Timeline header preview */}
            <div className="mb-3">
              <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-300 mb-2">
                Last Month Timeline
              </div>
              <div className="flex space-x-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800 bg-white/70 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300">
                  github-review
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-green-200 dark:border-green-800 bg-white/70 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300">
                  devinsight
                </span>
              </div>
            </div>

            {/* Activity chart preview */}
            <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-border mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Activity
                </span>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    PRs
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2"></span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Commits
                  </span>
                </div>
              </div>
              <div className="h-28 flex items-end space-x-1">
                <div className="h-1/2 w-6 bg-purple-200 dark:bg-purple-800/50 rounded-t-sm"></div>
                <div className="h-1/3 w-6 bg-purple-200 dark:bg-purple-800/50 rounded-t-sm"></div>
                <div className="h-2/3 w-6 bg-purple-300 dark:bg-purple-700/50 rounded-t-sm"></div>
                <div className="h-3/4 w-6 bg-purple-400 dark:bg-purple-600/60 rounded-t-sm"></div>
                <div className="h-full w-6 bg-purple-500 dark:bg-purple-500/70 rounded-t-sm"></div>
                <div className="h-2/3 w-6 bg-purple-400 dark:bg-purple-600/60 rounded-t-sm"></div>
                <div className="h-1/2 w-6 bg-purple-300 dark:bg-purple-700/50 rounded-t-sm"></div>
                <div className="h-1/4 w-6 bg-purple-200 dark:bg-purple-800/50 rounded-t-sm"></div>
              </div>
            </div>

            {/* Key Metrics preview */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white dark:bg-zinc-800/50 rounded-lg p-2 border border-border">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  PRs per week
                </div>
                <div className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  3.5
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800/50 rounded-lg p-2 border border-border">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Avg. days to close
                </div>
                <div className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  2.3
                </div>
              </div>
            </div>

            {/* AI Analysis preview */}
            <div className="bg-white dark:bg-zinc-800/50 p-3 rounded-lg border border-border">
              <div className="flex items-center mb-2">
                <svg
                  className="h-4 w-4 text-purple-500 mr-1.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  AI Analysis
                </span>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                Your code shows consistent patterns of clean function
                organization and good naming conventions...
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* AI Analysis Feature Showcase Section */}
      <motion.div
        className="w-full max-w-6xl mx-auto my-16 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-center mb-12">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            Powerful AI Code Analysis
          </motion.h2>
          <motion.p
            className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            Get deep insights into your code quality and development patterns
            with our AI-powered analysis tools
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* PR Analysis */}
          <motion.div
            className="bg-white dark:bg-zinc-800/50 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700/50 overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="bg-purple-50 dark:bg-purple-900/20 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700/50">
              <div className="flex items-center">
                <FileCode2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  PR Analysis
                </h3>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Detailed feedback on your individual pull requests
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Strengths */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    Strengths
                  </h4>
                </div>
                <div className="ml-11 space-y-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 rounded-md">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      Clean and modular component implementation with proper
                      separation of concerns
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 rounded-md">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      Effective use of TypeScript interfaces for type safety
                    </p>
                  </div>
                </div>
              </div>

              {/* Refinement Needs */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    Refinement Needs
                  </h4>
                </div>
                <div className="ml-11 space-y-2">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20 rounded-md">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      Consider implementing error boundaries for better
                      exception handling
                    </p>
                  </div>
                </div>
              </div>

              {/* Learning Pathways */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    Learning Pathways
                  </h4>
                </div>
                <div className="ml-11 space-y-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-md">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      Explore React Server Components for improved performance
                      and reduced client-side JavaScript
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Meta Analysis */}
          <motion.div
            className="bg-white dark:bg-zinc-800/50 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700/50 overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="bg-purple-50 dark:bg-purple-900/20 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700/50">
              <div className="flex items-center">
                <BarChart className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Meta Analysis
                </h3>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Find patterns and growth opportunities across your PRs
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Recurring Patterns */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    Recurring Patterns
                  </h4>
                </div>
                <div className="ml-11 space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                      strength
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                      refinement
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      learning
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 rounded-md">
                    <div className="flex items-center mb-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        Strong Component Architecture
                      </p>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-4">
                      Consistently implements well-structured components with
                      clear responsibilities
                    </p>
                  </div>
                </div>
              </div>

              {/* Focus Areas */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <BookOpenCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    Focus Areas
                  </h4>
                </div>
                <div className="ml-11 space-y-2">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/20 rounded-md">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Error Handling Strategies
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Implement comprehensive error handling with proper user
                      feedback
                    </p>
                  </div>
                </div>
              </div>

              {/* Managerial Insights */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Users2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h4 className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    Managerial Insights
                  </h4>
                </div>
                <div className="ml-11">
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/20 rounded-md">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      Developer shows strong frontend architectural skills.
                      Consider assigning complex UI projects to leverage
                      strengths.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            Our AI analyzes your code to provide actionable insights for both
            individual improvements and long-term career growth
          </p>
        </motion.div>
      </motion.div>

      {/* Feature highlights */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeIn} className="text-center">
          <div className="mx-auto mb-3 p-2.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 w-fit">
            <Activity size={24} strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Free</h3>
          <p className="text-muted-foreground text-sm">
            No credit card required. Free.
          </p>
        </motion.div>

        <motion.div variants={fadeIn} className="text-center">
          <div className="mx-auto mb-3 p-2.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 w-fit">
            <Lock size={24} strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Secure</h3>
          <p className="text-muted-foreground text-sm">
            Your emails are only read while scanning. No data is stored.
          </p>
        </motion.div>

        <motion.div variants={fadeIn} className="text-center">
          <div className="mx-auto mb-3 p-2.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 w-fit">
            <Code size={24} strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            Open Source
          </h3>
          <p className="text-muted-foreground text-sm">
            The code is open source and available on GitHub
          </p>
        </motion.div>
      </motion.div>

      {/* Footer with attribution - matched to the image */}
      <motion.div
        variants={fadeIn}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.6 } }}
        className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        <p>
          vibecoded by{" "}
          <a
            href="https://theboring.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            theboring.app
          </a>
        </p>
        <p className="mt-1 text-xs">
          Freemium tools for improving your everyday life
        </p>
      </motion.div>
    </div>
  );
}

export default UnauthenticatedView;
