import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "server-only": new URL("./tests/support/empty.js", import.meta.url)
        .pathname,
    },
  },
  test: {
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    env: {
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "dummy-secret-for-testing-must-be-at-least-32-chars-long",
      AUTH_TRUST_HOST: "true",
      MONGODB_URI: "mongodb://localhost:27017/restaurant_test_integration",
    },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
