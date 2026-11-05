import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside the React server runtime; tests run in plain Node.
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/integration/env.ts"],
    globalSetup: ["tests/integration/setup-db.ts"],
    // Integration tests share one database, so files run one at a time.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/features/**/domain/**"],
      reporter: ["text", "html"],
    },
  },
});
