import React from "react";

interface InitialStateProps {
  setIsConfigVisible: (isVisible: boolean) => void;
}

export default function InitialState({
  setIsConfigVisible,
}: InitialStateProps) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-400 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Analyze Code Quality
      </h3>
      <p className="text-gray-500 mb-4">
        Use AI to analyze this developer's code across multiple PRs to identify
        patterns, strengths, and areas for improvement.
      </p>
      <button
        onClick={() => setIsConfigVisible(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Get Started
      </button>
    </div>
  );
}
