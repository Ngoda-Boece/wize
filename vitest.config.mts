import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" throws outside the React Server bundler; tests run in plain Node.
      "server-only": path.resolve(import.meta.dirname, "tests/unit/server-only-stub.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
