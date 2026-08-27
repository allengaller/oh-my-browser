import { describe, it, expect } from "vitest";
import { scanDuplicates, scanSites } from "~/lib/dedup";
import type { Bookmark } from "~/types/bookmark";

const bm = (id: string, url: string, folderPath = "Dev", title = `T${id}`): Bookmark => ({
  id,
  parentId: "0",
  title,
  url,
  dateAdded: Number(id),
  folderPath,
});

describe("dedup.scanDuplicates", () => {
  it("groups bookmarks by normalized URL", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a"),
      bm("2", "https://example.com/a"),
      bm("3", "https://other.com/b"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.normalizedUrl).toBe("https://example.com/a");
    expect(groups[0]!.count).toBe(2);
  });

  it("treats tracking-param variants as duplicates", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a"),
      bm("2", "https://example.com/a?utm_source=x"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.count).toBe(2);
  });

  it("only returns groups with count >= 2", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a"),
      bm("2", "https://example.com/b"),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("marks cross-folder duplicates", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a", "Dev"),
      bm("2", "https://example.com/a", "Tools"),
    ]);
    expect(groups[0]!.crossFolder).toBe(true);
    expect(groups[0]!.folders).toEqual(["Dev", "Tools"]);
  });

  it("sorts by count desc then normalizedUrl asc", () => {
    const groups = scanDuplicates([
      bm("1", "https://aaa.com/x"),
      bm("2", "https://aaa.com/x"),
      bm("3", "https://aaa.com/x"),
      bm("4", "https://bbb.com/y"),
      bm("5", "https://bbb.com/y"),
    ]);
    expect(groups.map((g) => g.normalizedUrl)).toEqual(["https://aaa.com/x", "https://bbb.com/y"]);
    expect(groups.map((g) => g.count)).toEqual([3, 2]);
  });

  it("returns [] for empty input", () => {
    expect(scanDuplicates([])).toEqual([]);
  });
});

describe("dedup.scanSites", () => {
  it("aggregates subdomains under eTLD+1", () => {
    const sites = scanSites([
      bm("1", "https://www.solidot.org/a"),
      bm("2", "https://news.solidot.org/b"),
      bm("3", "https://github.com/c"),
    ]);
    expect(sites).toHaveLength(2);
    const solidot = sites.find((s) => s.siteKey === "solidot.org")!;
    expect(solidot.count).toBe(2);
    expect(solidot.crossFolder).toBe(false);
  });

  it("handles multi-level public suffixes", () => {
    const sites = scanSites([
      bm("1", "https://www.bbc.co.uk/a"),
      bm("2", "https://news.bbc.co.uk/b"),
    ]);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.siteKey).toBe("bbc.co.uk");
    expect(sites[0]!.count).toBe(2);
  });

  it("ignores bookmarks without a valid site key", () => {
    const sites = scanSites([
      bm("1", "http://localhost:3000"),
      bm("2", "not a url"),
      bm("3", "https://example.com/a"),
    ]);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.siteKey).toBe("example.com");
  });

  it("sorts by count desc then siteKey asc", () => {
    const sites = scanSites([
      bm("1", "https://a.com/x"),
      bm("2", "https://a.com/y"),
      bm("3", "https://z.org/z"),
    ]);
    expect(sites.map((s) => s.siteKey)).toEqual(["a.com", "z.org"]);
  });

  it("returns [] for empty input", () => {
    expect(scanSites([])).toEqual([]);
  });
});
