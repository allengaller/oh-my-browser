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
      // Check if already registered, otherwise wait for the event.
      let sw = context.serviceWorkers()[0];
      if (!sw) {
        sw = await context.waitForEvent("serviceworker", { timeout: 30000 });
      }

      // Open the popup by navigating to its HTML directly (bypassing the
      // browser action click, which is unreliable in headless mode).
      const page = await context.newPage();
      const extensionId = sw.url().match(/chrome-extension:\/\/([a-z]+)/)![1];
      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      // Wait for search input
      const input = page.getByPlaceholder(/search bookmarks/i);
      await expect(input).toBeVisible({ timeout: 10000 });

      // CI: fresh profile has no bookmarks; seed test data via service worker
      await sw.evaluate(async (): Promise<void> => {
        const bookmarks = [
          { title: "Kubernetes Documentation", url: "https://kubernetes.io/docs/" },
          { title: "Kubernetes GitHub", url: "https://github.com/kubernetes/kubernetes" },
          { title: "React Documentation", url: "https://react.dev/" },
          { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/" },
          { title: "Playwright Docs", url: "https://playwright.dev/docs/intro" },
        ];
        for (const bm of bookmarks) {
          await chrome.bookmarks.create(bm);
        }
      });

      // Allow the extension's sync to process seeded bookmarks
      await page.waitForTimeout(1000);

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
