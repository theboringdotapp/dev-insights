// Find-unused-react-imports.js
import fs from "fs";
import { glob } from "glob";

// Find all TSX files in the src directory
const tsxFiles = await glob("src/**/*.tsx");

// Regex to detect React import
const reactImportRegex =
  /import\s+React(\s*,\s*{[^}]*})?\s+from\s+['"]react['"];?/;

// Regex to detect React usage (JSX expressions, React hooks, React components, etc.)
const reactUsageRegex = /React\.|<>|<React/;

let unusedReactImportsCount = 0;

tsxFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");

  // Check if file imports React
  const hasReactImport = reactImportRegex.test(content);

  if (hasReactImport) {
    // Check if React is actually used
    const hasReactUsage = reactUsageRegex.test(content);

    if (!hasReactUsage) {
      console.log(`${file} - Unused React import`);
      unusedReactImportsCount++;
    }
  }
});

console.log(
  `\nFound ${unusedReactImportsCount} files with unused React imports`
);
