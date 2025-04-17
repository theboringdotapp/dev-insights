import React from "react";
import { FeedbackInstance, CodeContext } from "../../../lib/types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism"; // Or choose another style

interface Feature {
  text: string;
  count: number;
  instances: FeedbackInstance[];
}

interface TypeStyles {
  container: string;
  icon: string;
  link: string;
}

interface PRFeatureItemProps {
  feature: Feature;
  typeStyles: TypeStyles;
  icon: React.ReactNode;
  displayedPRIds?: number[];
}

// Simple component to render code block with syntax highlighting
const CodeBlock = ({ codeContext }: { codeContext: CodeContext }) => {
  const getLanguage = (filePath: string): string => {
    const extension = filePath.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "py":
        return "python";
      case "java":
        return "java";
      case "c":
      case "cpp":
      case "h":
        return "c"; // Using 'c' might cover cpp basic highlighting
      case "cs":
        return "csharp";
      case "go":
        return "go";
      case "rb":
        return "ruby";
      case "php":
        return "php";
      case "html":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "yaml":
      case "yml":
        return "yaml";
      case "md":
        return "markdown";
      case "sh":
        return "bash";
      default:
        return "plaintext"; // Default fallback
    }
  };

  const language = getLanguage(codeContext.filePath);

  return (
    <div className="mt-2 mb-3 border border-gray-200 rounded text-xs overflow-hidden">
      <div className="text-gray-500 px-3 py-1 bg-gray-50 border-b border-gray-200">
        {codeContext.filePath} ({codeContext.startLine}-{codeContext.endLine})
      </div>
      <SyntaxHighlighter
        language={language}
        style={atomDark} // Use the imported style
        customStyle={{ margin: 0, padding: "0.75rem" }} // Adjust padding/margin
        wrapLines={true}
        showLineNumbers={false} // Line numbers from context are more relevant
      >
        {codeContext.codeSnippet}
      </SyntaxHighlighter>
    </div>
  );
};

export default function PRFeatureItem({
  feature,
  typeStyles,
  icon,
  displayedPRIds = [],
}: PRFeatureItemProps) {
  // Filter displayed PRs
  const visiblePRs = feature.instances.map((instance) => instance.prId);

  // If no displayedPRIds provided, show all
  const showAll = displayedPRIds.length === 0;
  const filteredPRs = showAll
    ? visiblePRs
    : visiblePRs.filter((id) => displayedPRIds.includes(id));
  const actualCount = filteredPRs.length;

  return (
    <div className={`p-4 ${typeStyles.container} rounded-lg border`}>
      <div className="flex items-start mb-2">
        <div className={`${typeStyles.icon} mr-3 flex-shrink-0 mt-0.5`}>
          {icon}
        </div>
        <div>
          <h5 className="font-medium text-gray-800 text-base">
            {feature.text.charAt(0).toUpperCase() + feature.text.slice(1)}
          </h5>
        </div>
      </div>

      <div className="ml-8">
        <div className="text-xs text-gray-500 text-left">
          {!showAll && actualCount !== feature.count ? (
            <span>
              Found in {feature.count} PRs (showing {actualCount}):
            </span>
          ) : (
            <span>
              Found in {feature.count} PR{feature.count !== 1 ? "s" : ""}:
            </span>
          )}

          {/* Group PR links and then show code snippets */}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {feature.instances.map((instance, idx) => (
              <a
                key={instance.prId}
                href={instance.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center px-2 py-1 bg-white rounded border ${typeStyles.link}`}
                title={instance.prTitle}
              >
                #{instance.prUrl.split("/").pop()}
              </a>
            ))}
          </div>

          {/* Render Code Snippets */}
          <div className="mt-3 space-y-2">
            {feature.instances.map((instance, idx) =>
              instance.codeContext ? (
                <CodeBlock
                  key={`code-${instance.prId}-${idx}`}
                  codeContext={instance.codeContext}
                />
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
