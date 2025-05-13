import React, { useState, useEffect } from "react";
import { FeedbackItem } from "../../lib/types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface FeedbackSectionProps {
  title: string;
  items: FeedbackItem[];
  badgeColor: string;
  iconComponent?: React.ReactNode;
}

/**
 * FeedbackSection component displays a category of feedback items
 * with consistent styling and proper handling of empty states.
 */
export function FeedbackSection({
  title,
  items,
  badgeColor,
  iconComponent,
}: FeedbackSectionProps) {
  // State to track which code snippets are visible and dark mode
  const [visibleCodeSnippets, setVisibleCodeSnippets] = useState<number[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Detect dark mode
  useEffect(() => {
    // Initial check
    setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches || 
                 document.documentElement.classList.contains('dark'));
    
    // Watch for changes
    const darkModeListener = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', darkModeListener);
    
    return () => mediaQuery.removeEventListener('change', darkModeListener);
  }, []);

  // Toggle code snippet visibility
  const toggleCodeSnippet = (index: number) => {
    setVisibleCodeSnippets(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Helper function to determine language from file path
  const getLanguageFromPath = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    
    const extensionMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      go: 'go',
      rs: 'rust',
      php: 'php',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
    };
    
    return extensionMap[extension] || 'text';
  };

  // Don't render anything if there are no items
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center mb-2">
        {iconComponent && <span className="mr-1.5">{iconComponent}</span>}
        {title}
      </h4>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex flex-col">
            <div className="flex items-start group">
              <span
                className={`mt-0.5 mr-2 px-1.5 py-0.5 text-xs rounded flex-shrink-0 border ${badgeColor}`}
              >
                {index + 1}
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 text-left flex-grow">
                {item.text}
              </span>
              {item.codeContext && (
                <button
                  onClick={() => toggleCodeSnippet(index)}
                  className="ml-1 p-1 text-xs text-purple-500 hover:text-purple-700 focus:outline-none transition-transform duration-200 ease-in-out"
                  title={visibleCodeSnippets.includes(index) ? "Hide code" : "Show code"}
                  style={{ transform: visibleCodeSnippets.includes(index) ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-500 dark:text-purple-400"
                  >
                    <path d="M9 18l6-6-6-6"></path>
                  </svg>
                </button>
              )}
            </div>
            {item.codeContext && (
              <div 
                className={`rounded overflow-hidden text-xs w-full transition-all duration-300 ease-in-out ${
                  visibleCodeSnippets.includes(index) ? 'mt-2 mb-2 max-h-[300px] opacity-100 border border-zinc-200 dark:border-zinc-700' : 'max-h-0 opacity-0 border-0 m-0'
                }`}
              >
                <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-mono border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <span className="truncate text-left mr-2">{item.codeContext.filePath} (lines {item.codeContext.startLine}-{item.codeContext.endLine})</span>
                  <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0">Code context</span>
                </div>
                <SyntaxHighlighter
                  language={getLanguageFromPath(item.codeContext.filePath)}
                  style={isDarkMode ? vscDarkPlus : oneLight}
                  customStyle={{ 
                    margin: 0, 
                    borderRadius: 0, 
                    fontSize: '0.75rem', 
                    maxHeight: '220px',
                    backgroundColor: isDarkMode ? 'rgb(30, 30, 30)' : 'rgb(250, 250, 250)',
                    transition: 'all 0.3s ease-in-out'
                  }}
                  wrapLines={true}
                  showLineNumbers={true}
                >
                  {item.codeContext.codeSnippet}
                </SyntaxHighlighter>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FeedbackSection;
