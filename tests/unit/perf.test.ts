import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildIndex, query } from "~/modules/search";
import type { Bookmark } from "~/types/bookmark";

/**
 * 解析 Netscape bookmark HTML 为 Bookmark[]。
 * 简单解析，足够性能测试。
 */
function parseHtml(content: string): Bookmark[] {
  const bookmarks: Bookmark[] = [];
  const lines = content.split("\n");
  let folderPath: string[] = [];
  let dlDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<DT><H3")) {
      const title = trimmed.match(/>([^<]+)</)?.[1] ?? "";
      folderPath.push(title);
    } else if (trimmed.startsWith("<DT><A HREF=")) {
      const href = trimmed.match(/HREF="([^"]+)"/)?.[1] ?? "";
      const title = trimmed.match(/>([^<]+)</)?.[1] ?? "";
      const dateAdded = Number(trimmed.match(/ADD_DATE="(\d+)"/)?.[1] ?? 0) * 1000;
      bookmarks.push({
        id: `bm-${bookmarks.length}`,
        parentId: "0",
        title,
        url: href,
        dateAdded,
        folderPath: folderPath.join("/"),
      });
    } else if (trimmed.startsWith("</DL>")) {
      if (folderPath.length > 0) folderPath.pop();
    }
  }
  return bookmarks;
}

describe("performance", () => {
  it("indexes 1,661 bookmarks in < 200ms", () => {
    const html = readFileSync(
      resolve(process.cwd(), "tests/fixtures/bookmarks_7_5_12.html"),
      "utf-8",
    );
    const bookmarks = parseHtml(html);
    expect(bookmarks.length).toBeGreaterThan(1000);

    const start = performance.now();
    const index = buildIndex(bookmarks);
    const elapsed = performance.now() - start;

    console.log(`Indexed ${bookmarks.length} bookmarks in ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(200);
  });

  it("queries 1,661 bookmarks in < 50ms", () => {
    const html = readFileSync(
      resolve(process.cwd(), "tests/fixtures/bookmarks_7_5_12.html"),
      "utf-8",
    );
    const bookmarks = parseHtml(html);
    const index = buildIndex(bookmarks);

    const start = performance.now();
    const results = query(index, "kubernetes", 10);
    const elapsed = performance.now() - start;

    console.log(`Query returned ${results.length} results in ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(50);
  });
});
