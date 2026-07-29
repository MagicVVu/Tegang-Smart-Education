import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["packages/business-rules/src/**/*.ts", "apps/web/src/stores/**/*.ts"]
    }
  }
});
