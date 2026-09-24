import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e harness (TEST-007.2).
 *
 * Port 3009 is owned by this runner — not 3003, which `npm run dev` /
 * `just dev` already binds. `reuseExistingServer: false` always, so a
 * leftover process on 3009 cannot silently serve the wrong tree.
 * `NEXT_E2E_BUILD` moves this server to its own `distDir` (`.next-e2e/`):
 * Next 16 allows one `next dev` per `distDir`, so without it the runner
 * refused to start while `just dev` held `.next/` (DEPLOY-008.3).
 */
const E2E_PORT = 3009;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
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
    command: `npx next dev --turbopack -H 127.0.0.1 -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    env: { NEXT_E2E_BUILD: "1" },
    timeout: 120_000,
  },
});
