import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { MockAuthProvider } from "../mocks/AuthMock";

/**
 * Custom render function that wraps components with both MockAuthProvider and MemoryRouter
 * Use this for components that need both authentication and routing
 */
export function renderWithRouter(
  ui: ReactElement,
  {
    route = "/",
    ...renderOptions
  }: { route?: string } & Omit<RenderOptions, "wrapper"> = {}
) {
  return render(
    <MockAuthProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </MockAuthProvider>,
    renderOptions
  );
}

/**
 * Setup function to initialize standard test environment
 */
export function setupTestEnvironment() {
  // Mock console methods to reduce test noise
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
}

/**
 * Cleanup function to reset mocks after tests
 */
export function cleanupTestEnvironment() {
  // Reset console mocks
  vi.mocked(console.log).mockClear();
  vi.mocked(console.error).mockClear();
  vi.mocked(console.warn).mockClear();
}
