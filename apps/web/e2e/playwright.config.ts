import { defineConfig, devices } from "@playwright/test";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./specs",
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/rapport" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
        locale: "fr-FR",
        timezoneId: "Africa/Kinshasa",
      },
    },
    {
      name: "Samsung (client)",
      use: {
        ...devices["Galaxy S24"],
        locale: "fr-FR",
        timezoneId: "Africa/Kinshasa",
      },
    },
    {
      name: "V2 (prestataire)",
      use: {
        ...devices["Galaxy Tab S9"],
        locale: "fr-FR",
        timezoneId: "Africa/Kinshasa",
      },
    },
  ],
});
