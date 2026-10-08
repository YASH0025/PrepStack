import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
/** Set E2E_DATABASE_URL to run the suite on PostgreSQL + Better Auth. */
const DATABASE_URL = process.env.E2E_DATABASE_URL;
const BASE_URL = `http://localhost:${PORT}`;

/** Optional custom browser (CI images or sandboxes without Playwright's own download). */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const extraArgs: string[] = process.env.PW_CHROMIUM_ARGS
  ? JSON.parse(process.env.PW_CHROMIUM_ARGS)
  : [];

/**
 * End-to-end tests run against `next dev` with a throwaway data folder
 * (.e2e-data, wiped on every run) and test-only secrets.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    navigationTimeout: 90_000,
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath, args: extraArgs },
      },
    },
  ],
  webServer: {
    command: `rm -rf .e2e-data && node scripts/e2e-reset-db.mjs && node scripts/copy-vendor.mjs && next dev -p ${PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATA_DIR: "./.e2e-data",
      APP_URL: BASE_URL,
      SESSION_SECRET: "e2e-session-secret-that-is-long-enough-123",
      ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
      CRON_SECRET: "e2e-cron-secret-1234",
      ADMIN_EMAILS: "admin@e2e.test",
      COMMUNITY_MIN_SAMPLE: "5",
      ...(DATABASE_URL ? { STORAGE_DRIVER: "postgres", DATABASE_URL } : {}),
    },
  },
});
