import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// MV3 service workers require a persistent browser context. The default
// chromium.launch() uses a non-persistent context, which prevents MV3
// service workers from registering reliably in headless mode.
//
// Workaround: pass --user-data-dir to Chromium. This makes the launch
// effectively a persistent context, allowing MV3 service workers to register.
const persistentUserDataDir = mkdtempSync(join(tmpdir(), "playwright-omb-"));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--headless=new",
            `--user-data-dir=${persistentUserDataDir}`,
            "--disable-extensions-except=" + process.cwd() + "/.output/chrome-mv3",
            "--load-extension=" + process.cwd() + "/.output/chrome-mv3",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "pnpm build",
    port: 0,
    reuseExistingServer: !process.env.CI,
    cwd: ".",
  },
});