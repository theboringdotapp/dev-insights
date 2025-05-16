import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalysisStore } from "../../../stores/analysisStore";
import { CodeQualityInsights } from "../../CodeQualityInsights";

// Import shared mocks and utilities
import cacheService from "../../../lib/cacheService";
import {
  mockAnalysisResults,
  mockPullRequests,
} from "../../../test/mocks/data";
import {
  createLocalStorageMock,
  setupCacheServiceMock,
  setupGitHubServiceMocks,
} from "../../../test/mocks/services";
import {
  cleanupTestEnvironment,
  renderWithRouter,
  setupTestEnvironment,
} from "../../../test/utils/render";

// Setup test environment
setupTestEnvironment();

// Setup service mocks
setupCacheServiceMock();
setupGitHubServiceMocks();

// Setup localStorage mock
const localStorageMock = createLocalStorageMock();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Optional: Mock console methods to reduce test noise
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

describe("CodeQualityInsights", () => {
  beforeEach(() => {
    // Reset store between tests
    const store = useAnalysisStore.getState();
    store.clearAnalysisData();

    // Reset localStorage
    localStorageMock.clear();

    // Skip resetting mocks for now
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  // Helper function to render the component with common props
  const renderComponent = (props = {}) => {
    return renderWithRouter(
      <CodeQualityInsights
        pullRequests={mockPullRequests}
        developerId="testuser"
        {...props}
      />
    );
  };

  describe("Initial render", () => {
    it("renders empty state when no PRs are analyzed", () => {
      renderComponent();

      // Empty state should be visible with some call to action
      expect(
        screen.getByText("Analyze Your PRs for Growth")
      ).toBeInTheDocument();
    });
  });

  describe("UI Interactions", () => {
    it("shows configuration panel when settings button is clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      // Find and click the settings button (the gear icon button)
      const settingsButton = screen.getByRole("button", {
        // Find it by its class instead of text since it has no accessible name
        name: "",
      });

      await user.click(settingsButton);

      // Configuration panel should be visible
      await waitFor(() => {
        expect(screen.getByText(/AI Provider/i)).toBeInTheDocument();
      });
    });

    // New test cases can be added here
  });

  describe("Analysis functionality", () => {
    it("displays previously analyzed PRs when they exist in cache", async () => {
      // Setup cache to return mock analysis results for specific PR IDs
      // Direct assignment instead of mockImplementation
      cacheService.getPRAnalysis = vi.fn((prId) => {
        const result = mockAnalysisResults.find(
          (result) => result.prId === prId
        );
        return Promise.resolve(result || null);
      });

      // Initialize the analysis store with already analyzed PRs
      const store = useAnalysisStore.getState();
      store.addAnalyzedPRIds([1, 2]); // IDs matching our mock data

      renderComponent();

      // Wait for average score to be calculated and displayed
      await waitFor(() => {
        // Since our mock data has an average score of (8.2 + 6.8) / 2 = 7.5
        // We can check that the metrics summary shows this information
        expect(screen.getByText(/PRs Analyzed/i)).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("shows analysis prompt when pattern analysis is in cache", async () => {
      // Setup cache to return pattern analysis
      // Direct assignment instead of mockResolvedValue
      cacheService.getPatternAnalysis = vi.fn().mockReturnValue(
        Promise.resolve({
          recurring_patterns: [
            {
              category: "strength",
              pattern_name: "Test Pattern",
              description: "This is a test pattern",
              frequency: "High",
              impact: "Medium",
            },
          ],
          recommended_focus_areas: [],
          development_trajectory: {
            current_level: "Mid-level",
            next_milestone: "Senior",
            key_actions: ["Learn more about X"],
          },
          managerial_insights: {
            strengths_to_leverage: "Good code organization",
            growth_support: "Needs mentoring in Y",
            project_recommendations: "Should work on Z",
          },
        })
      );

      // Initialize the analysis store with already analyzed PRs
      const store = useAnalysisStore.getState();
      store.addAnalyzedPRIds([1, 2]); // IDs matching our mock data

      // Set selected PRs (converting Set to Array to avoid type issues)
      if (typeof store.setSelectedPRIds === "function") {
        store.setSelectedPRIds([1, 2]);
      }

      renderComponent();

      // Wait for any analysis-related UI to appear
      await waitFor(() => {
        // Look for common text that should appear when we have analyzed PRs
        expect(screen.getByText(/Perform Deep Analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/This feature helps you/i)).toBeInTheDocument();
      });
    });
  });
});
