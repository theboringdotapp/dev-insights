/**
 * Test utilities for diff formatting improvements
 * This file helps developers understand and test the enhanced diff processing
 */

import { formatPRFilesForAnalysis } from '../lib/aiAnalysisService';

/**
 * Example git diff patches for testing the improved formatting
 */
export const sampleDiffs = {
  // Simple function change
  simpleFunction: `@@ -15,8 +15,12 @@ export function calculateTotal(items: Item[]): number {
   let total = 0;
   
   for (const item of items) {
-    total += item.price;
+    // Apply discount if available
+    const price = item.discount ? item.price * (1 - item.discount) : item.price;
+    total += price;
   }
   
+  // Round to 2 decimal places
+  total = Math.round(total * 100) / 100;
   return total;
 }`,

  // CSS changes
  styling: `@@ -25,10 +25,15 @@ 
 .button {
   background-color: #007bff;
   color: white;
-  padding: 8px 16px;
+  padding: 10px 20px;
   border: none;
   border-radius: 4px;
   cursor: pointer;
+  transition: all 0.2s ease;
+}
+
+.button:hover {
+  background-color: #0056b3;
 }`,

  // Complex refactor
  refactor: `@@ -45,25 +45,18 @@ class UserService {
   }
   
-  async getUserById(id: string): Promise<User | null> {
-    try {
-      const response = await fetch(\`/api/users/\${id}\`);
-      if (!response.ok) {
-        if (response.status === 404) {
-          return null;
-        }
-        throw new Error(\`Failed to fetch user: \${response.statusText}\`);
-      }
-      const userData = await response.json();
-      return new User(userData);
-    } catch (error) {
-      console.error('Error fetching user:', error);
-      throw error;
-    }
+  async getUserById(id: string): Promise<User | null> {
+    const response = await this.apiClient.get(\`/users/\${id}\`);
+    return response.data ? new User(response.data) : null;
   }
+  
+  private handleApiError(error: ApiError): void {
+    this.logger.error('API request failed:', error);
+    throw new UserServiceError(error.message, error.code);
+  }
 }`
};

/**
 * Test the improved diff formatting with sample data
 */
export function testDiffFormatting(): void {
  console.log('=== Testing Improved Diff Formatting ===\n');

  const testFiles = [
    { filename: 'src/utils/calculations.ts', patch: sampleDiffs.simpleFunction },
    { filename: 'src/styles/button.css', patch: sampleDiffs.styling },
    { filename: 'src/services/UserService.ts', patch: sampleDiffs.refactor }
  ];

  const formatted = formatPRFilesForAnalysis(
    testFiles,
    'Improve user experience and code quality',
    123
  );

  console.log('Formatted diff for LLM analysis:');
  console.log('=====================================');
  console.log(formatted);
  console.log('=====================================\n');

  // Show comparison with raw diff
  console.log('Raw diff (what we had before):');
  console.log('==============================');
  testFiles.forEach(file => {
    console.log(`File: ${file.filename}`);
    console.log(file.patch);
    console.log('---');
  });
}

/**
 * Compare old vs new formatting approaches
 */
export function compareDiffFormats(files: { filename: string; patch?: string }[]): {
  oldFormat: string;
  newFormat: string;
  improvements: string[];
} {
  // Simulate old format (basic concatenation)
  let oldFormat = `Changes:\n`;
  files.forEach(file => {
    if (file.patch) {
      oldFormat += `\nFile: ${file.filename}\n${file.patch}\n`;
    }
  });

  // New format
  const newFormat = formatPRFilesForAnalysis(files, 'Test PR', 1);

  const improvements = [
    '✅ Clear separation of removed vs added code',
    '✅ Structured sections with markdown formatting',
    '✅ Context sections for better understanding',
    '✅ Metadata about change complexity',
    '✅ Better token limit management',
    '✅ File summaries when content is too large',
    '✅ Prioritization of smaller files first'
  ];

  return { oldFormat, newFormat, improvements };
}

/**
 * Validate that the diff parsing works correctly
 */
export function validateDiffParsing(): boolean {
  try {
    const result = formatPRFilesForAnalysis(
      [{ filename: 'test.js', patch: sampleDiffs.simpleFunction }],
      'Test',
      1
    );
    
    // Check that the result contains expected sections
    const hasRemovedSection = result.includes('### Removed Code:');
    const hasAddedSection = result.includes('### Added Code:');
    const hasStructuredFormat = result.includes('## File:');
    
    if (hasRemovedSection && hasAddedSection && hasStructuredFormat) {
      console.log('✅ Diff parsing validation passed');
      return true;
    } else {
      console.log('❌ Diff parsing validation failed');
      console.log('Missing sections:', {
        hasRemovedSection,
        hasAddedSection,
        hasStructuredFormat
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Diff parsing validation error:', error);
    return false;
  }
}