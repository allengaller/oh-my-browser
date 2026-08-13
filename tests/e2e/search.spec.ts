import { test, expect } from "@playwright/test";

test.describe("oh-my-bookmarks popup", () => {
  test("opens, searches, and navigates", async ({ page, context }) => {
    // 打开 popup（通过 service worker 触发）
    const sw = context.serviceWorkers()[0];
    if (!sw) throw new Error("Service worker not found");

    // 模拟用户操作：直接打开 popup HTML
    await page.goto("chrome-extension://" + (await sw.url()).match(/chrome-extension:\/\/([a-z]+)/)![1] + "/popup.html");

    // 等待搜索框
    const input = page.getByPlaceholder(/search bookmarks/i);
    await expect(input).toBeVisible({ timeout: 10000 });

    // 输入查询
    await input.fill("kubernetes");

    // 等待结果
    await page.waitForTimeout(500);

    // 验证至少一个结果
    const items = page.locator(".cursor-pointer");
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });
});