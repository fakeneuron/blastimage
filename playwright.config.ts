import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e harness (TEST-007.2).
 *
 * Port 3009 is owned by this runner — not 3003, which `npm run dev` /
 * `just dev` already binds. `reuseExistingServer: false` always, so a
 * leftover process on 3009 cannot silently serve the wrong tree, and
 * `just e2e` can run while `just dev` stays up.
 */
const E2E_PORT = 3009;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev --turbopack -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
