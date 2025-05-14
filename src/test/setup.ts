import "@testing-library/jest-dom";
import { vi } from "vitest";
import * as authMock from "./mocks/AuthMock";

// Mock the entire auth module with our mock implementation
vi.mock("../lib/auth", () => {
  return {
    ...authMock,
    AuthProvider: authMock.MockAuthProvider,
  };
});

// Mock IndexedDB
const indexedDB = {
  open: vi.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          put: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
        }),
        oncomplete: null,
        onerror: null,
      }),
    },
  }),
};

// Add to global
vi.stubGlobal("indexedDB", indexedDB);

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
