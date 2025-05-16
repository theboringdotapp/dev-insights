#!/usr/bin/env node

/**
 * This script analyzes the bundle size after building the project.
 * Run it after a build to see detailed bundle analysis.
 *
 * Usage: node analyze-bundle.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const distFolder = path.join(__dirname, "dist", "assets");
const totalSizeLimit = 1024 * 1024; // 1MB

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Function to format file size
function formatSize(bytes) {
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
}

// Function to get file size and gzipped size
function getFileSizes(filePath) {
  const content = fs.readFileSync(filePath);
  const size = content.length;
  const gzippedSize = zlib.gzipSync(content).length;
  return { size, gzippedSize };
}

// Main function to analyze bundle
async function analyzeBundles() {
  console.log(`${colors.blue}=== Bundle Size Analysis ===${colors.reset}\n`);

  try {
    // Read all files in dist/assets
    const files = fs
      .readdirSync(distFolder)
      .filter((file) => file.endsWith(".js") || file.endsWith(".css"));

    if (files.length === 0) {
      console.log(
        `${colors.yellow}No bundle files found. Did you run \`npm run build\` first?${colors.reset}`
      );
      return;
    }

    // Collect file information
    const fileInfos = files.map((file) => {
      const filePath = path.join(distFolder, file);
      const { size, gzippedSize } = getFileSizes(filePath);
      return { name: file, size, gzippedSize };
    });

    // Sort by size (descending)
    fileInfos.sort((a, b) => b.size - a.size);

    // Calculate total size
    const totalSize = fileInfos.reduce((sum, file) => sum + file.size, 0);
    const totalGzippedSize = fileInfos.reduce(
      (sum, file) => sum + file.gzippedSize,
      0
    );

    // Print individual file sizes
    console.log(`${colors.cyan}Individual Bundle Sizes:${colors.reset}`);
    fileInfos.forEach((file) => {
      const sizeColor =
        file.size > 250 * 1024
          ? colors.red
          : file.size > 100 * 1024
          ? colors.yellow
          : colors.green;
      console.log(
        `${file.name.padEnd(40)} ${sizeColor}${formatSize(file.size).padEnd(
          10
        )}${colors.reset} ` + `(gzipped: ${formatSize(file.gzippedSize)})`
      );
    });

    // Print total size
    console.log(`\n${colors.cyan}Total Bundle Size:${colors.reset}`);
    const totalSizeColor =
      totalSize > totalSizeLimit ? colors.red : colors.green;
    console.log(
      `${totalSizeColor}${formatSize(totalSize)}${colors.reset} ` +
        `(gzipped: ${formatSize(totalGzippedSize)})`
    );

    // Print suggestion if bundle is too large
    if (totalSize > totalSizeLimit) {
      console.log(
        `\n${colors.yellow}Suggestion:${colors.reset} Your bundle is quite large. Consider further optimizations:`
      );
      console.log("- Use code splitting for routes and large components");
      console.log(
        "- Analyze dependencies with `npm run analyze` and remove unnecessary ones"
      );
      console.log(
        "- Use dynamic imports for libraries used only in specific sections"
      );
    } else {
      console.log(
        `\n${colors.green}Your bundle size looks good!${colors.reset}`
      );
    }
  } catch (error) {
    console.error(
      `${colors.red}Error analyzing bundles:${colors.reset}`,
      error
    );
  }
}

// Run the analysis
analyzeBundles();
