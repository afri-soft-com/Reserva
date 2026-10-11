import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // Couverture ciblée modules critiques testés en unitaire (seuils modestes)
      include: [
        "src/modules/paiements/afrisoft-pay.hub.ts",
        "src/modules/paiements/mobilemoney.adapter.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/index.ts", "**/*.integration.test.ts"],
      thresholds: {
        lines: 30,
        functions: 35,
        statements: 30,
      },
    },
  },
});
