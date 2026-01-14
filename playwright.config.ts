import { defineConfig, devices } from "@playwright/test"

/**
 * FamilyLoad E2E Test Configuration
 */
export default defineConfig({
  testDir: "./e2e",
  // Run tests in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env["CI"],
  // Retry on CI only
  retries: process.env["CI"] ? 2 : 0,
  // Opt out of parallel tests on CI
  workers: process.env["CI"] ? 1 : undefined,
  // Reporter
  reporter: process.env["CI"] ? "github" : "html",
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3000",
    // Collect trace when retrying the failed test
    trace: "on-first-retry",
    // Screenshot on failure
    screenshot: "only-on-failure",
    // Video on failure
    video: "on-first-retry",
  },
  // Global timeout for each test - 30 seconds as per CLAUDE.md
  timeout: 30000,
  // Expect timeout
  expect: {
    timeout: 10000,
  },
  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    // Mobile viewport
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Run local dev server before starting the tests
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
  },
})
