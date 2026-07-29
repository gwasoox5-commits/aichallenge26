import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "docs/release/screenshots/playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.platform === "win32"
      ? "powershell -NoProfile -Command \"if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run dev\""
      : "rm -rf .next && npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "development",
      BSP_USE_MEMORY: "1",
      BSP_AUTH_SECRET: process.env.BSP_AUTH_SECRET ?? "dev-bsp-auth-secret-min-32-chars!!",
      BSP_ADMIN_PASSWORD: process.env.BSP_ADMIN_PASSWORD ?? "admin10193",
      BSP_DEMO_MODE: "false",
      BSP_ALLOW_FIXTURE: "true",
      PORT,
    },
  },
});
