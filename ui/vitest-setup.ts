import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test to prevent multiple elements in DOM
afterEach(() => {
  cleanup();
});
