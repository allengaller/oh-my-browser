import { test, expect, chromium } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// MV3 service workers require a persistent browser context. The default
// Playwright Test `chromium.launch()` flow uses a non-persistent context
// and explicitly rejects `--user-data-dir`. We must call
// `chromium.launchPersistentContext()` directly.
const userDataDir = mkdtempSync(join(tmpdir(), "playwright-omb-"));
const extensionPath = join(process.cwd(), ".output/chrome-mv3");

test.describe("oh-my-bookmarks popup", () => {
  test("opens, searches, and navigates", async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: !process.env.CI,
      args: ["--disable-extensions-except=" + extensionPath, "--load-extension=" + extensionPath],
    });

    try {
      // MV3 service workers register asynchronously after the extension loads.
      // Wait for it explicitly instead of polling context.serviceWorkers().
      const sw = await context.waitForEvent("serviceworker", { timeout: 15000 });

      // Open the popup by navigating to its HTML directly (bypassing the
      // browser action click, which is unreliable in headless mode).
      const page = await context.newPage();
      const extensionId = sw.url().match(/chrome-extension:\/\/([a-z]+)/)![1];
      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      // Wait for search input
      const input = page.getByPlaceholder(/search bookmarks/i);
      await expect(input).toBeVisible({ timeout: 10000 });

      // Type query
      await input.fill("kubernetes");

      // Wait for results to render (debounced in the UI)
      await page.waitForTimeout(500);

      // Verify at least one result is visible
      const items = page.locator(".cursor-pointer");
      await expect(items.first()).toBeVisible({ timeout: 5000 });
    } finally {
      await context.close();
    }
  });
});
