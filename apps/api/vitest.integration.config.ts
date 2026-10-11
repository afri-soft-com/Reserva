import { defineConfig } from "vitest/config";

/** Suite HTTP (GATEWAY_URL) — séquentielle pour éviter les 409 sur créneaux. */
export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
