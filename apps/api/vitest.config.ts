import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/modules/economie/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/index.ts"],
      // Rapport coverage sans seuil bloquant — durcir après plus d'unitaires
    },
  },
});
