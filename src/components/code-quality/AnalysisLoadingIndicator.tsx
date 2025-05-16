

// No props needed
export default function AnalysisLoadingIndicator() {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card my-6 shadow-sm">
      <div className="flex flex-col md:flex-row">
        {/* Left content area */}
        <div className="p-8 flex-1">
          <h3 className="text-xl font-bold text-foreground mb-3 flex items-center">
            <svg
              className="animate-spin h-6 w-6 text-primary mr-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Analyzing Pull Requests...
          </h3>

          <p className="text-muted-foreground mb-6 leading-relaxed">
            Our AI agent is currently reviewing the selected pull requests to
            generate quality insights. This may take a few moments depending on
            the complexity and number of PRs.
          </p>

          <div className="bg-muted p-4 rounded-md border border-border">
            <p className="text-sm text-foreground font-medium">Did you know?</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can configure the analysis model (OpenAI or Anthropic) and
              save your API key in the settings panel.
            </p>
          </div>
        </div>

        {/* Right decorative area - kept similar to NoAnalyzedPRsState */}
        <div className="hidden md:block w-1/3 bg-primary p-6 relative">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid-loading"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-loading)" />
            </svg>
          </div>
          {/* Animated dots or similar could go here */}
          <div className="relative z-10 h-full flex flex-col justify-center items-center text-primary-foreground">
            <svg
              className="w-16 h-16 opacity-80 mb-4 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <p className="text-sm font-medium opacity-90">Please wait...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
