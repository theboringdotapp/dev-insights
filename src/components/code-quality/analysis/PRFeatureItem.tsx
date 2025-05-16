import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CodeContext, FeedbackInstance } from "../../../lib/types";

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
    <div className="mt-2 mb-1 text-xs overflow-hidden rounded-md shadow-sm">
      <div className="text-gray-500 px-3 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 text-sm text-left">
        {codeContext.filePath} ({codeContext.startLine}-{codeContext.endLine})
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: "0.75rem", fontSize: "0.875rem" }}
        wrapLines={true}
        showLineNumbers={false}
      >
        {codeContext.codeSnippet}
      </SyntaxHighlighter>
    </div>
  );
};

export default function PRFeatureItem({
  feature,
  typeStyles,
  displayedPRIds = [],
}: PRFeatureItemProps) {
  // Determine which instances to show based on displayedPRIds
  const instancesToShow =
    displayedPRIds.length === 0
      ? feature.instances // Show all if displayedPRIds is empty
      : feature.instances.filter((instance) =>
          displayedPRIds.includes(instance.prId)
        );

  // More modern styling based on type - Overriding parts of the old typeStyles prop logic
  const getModernStyles = () => {
    // Using softer neutral background, subtle border, relying on icon color
    switch (typeStyles.container.split(" ")[0]) {
      case "bg-green-50":
        return {
          // Softer background, subtle border, removed colored border
          container:
            "dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60",
          icon: "text-green-600 dark:text-green-400",
          link: "border-green-300 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700 dark:hover:bg-green-800/60",
          text: "text-zinc-900 dark:text-zinc-100", // Updated text color for contrast
        };
      case "bg-red-50":
        return {
          container:
            "dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60",
          icon: "text-red-600 dark:text-red-400",
          link: "border-red-300 bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700 dark:hover:bg-red-800/60",
          text: "text-zinc-900 dark:text-zinc-100",
        };
      case "bg-blue-50":
      default:
        return {
          container:
            "dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60",
          icon: "text-blue-600 dark:text-blue-400",
          link: "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700 dark:hover:bg-blue-800/60",
          text: "text-zinc-900 dark:text-zinc-100",
        };
    }
  };

  const modernStyles = getModernStyles();

  return (
    <div className={`relative p-5 ${modernStyles.container} rounded-lg`}>
      {/* PR Links moved to top-right */}
      <div className="absolute top-4 right-4 flex flex-wrap gap-2">
        {instancesToShow.map((instance, idx) => (
          <a
            key={`${instance.prId}-${idx}`}
            href={instance.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-150 ${modernStyles.link}`}
            title={instance.prTitle}
          >
            #{instance.prUrl.split("/").pop()}
          </a>
        ))}
      </div>

      {/* Main content: Title Only - Icon Removed */}
      <div className="mb-3">
        <h5
          className={`font-semibold ${modernStyles.text} text-base text-left`}
        >
          {feature.text.charAt(0).toUpperCase() + feature.text.slice(1)}
        </h5>
      </div>

      {/* Content: Snippets - No longer indented relative to icon */}
      <div>
        {/* Render Code Snippets Section */}
        <div className="space-y-3">
          {instancesToShow.map((instance, idx) =>
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
  );
}
