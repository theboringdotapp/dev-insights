import fs from "fs";
import { glob } from "glob";

// Find all TSX files in the src directory
const tsxFiles = await glob("src/**/*.tsx");

// Regex to detect React import
const reactImportRegex =
  /import\s+React(\s*,\s*{[^}]*})?\s+from\s+['"]react['"];?/;

// Regex to detect React usage (JSX expressions, React hooks, React components, etc.)
const reactUsageRegex = /React\.|<>|<React/;

// Regex to detect React import with other imports (we need special handling to keep the other imports)
const reactWithOtherImportsRegex =
  /import\s+React,\s*({[^}]*})\s+from\s+['"]react['"];?/;

let removedCount = 0;

tsxFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");

  // Check if file imports React
  const hasReactImport = reactImportRegex.test(content);

  if (hasReactImport) {
    // Check if React is actually used
    const hasReactUsage = reactUsageRegex.test(content);

    if (!hasReactUsage) {
      let newContent;

      // Handle the case where React is imported along with other named imports
      const reactWithOtherImportsMatch = content.match(
        reactWithOtherImportsRegex
      );
      if (reactWithOtherImportsMatch) {
        // Keep the other imports
        const otherImports = reactWithOtherImportsMatch[1];
        newContent = content.replace(
          reactWithOtherImportsRegex,
          `import ${otherImports} from "react";`
        );
      } else {
        // Simple case: standalone React import
        newContent = content.replace(reactImportRegex, "");
      }

      // Write the modified content back to the file
      fs.writeFileSync(file, newContent);

      console.log(`Removed unused React import from ${file}`);
      removedCount++;
    }
  }
});

console.log(`\nRemoved unused React imports from ${removedCount} files`);
