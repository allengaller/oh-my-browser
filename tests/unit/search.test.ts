import { describe, it, expect } from "vitest";
import { buildIndex, query } from "~/modules/search";
import type { Bookmark } from "~/types/bookmark";

const sample: Bookmark[] = [
  { id: "1", parentId: "0", title: "GitHub", url: "https://github.com", dateAdded: 1, folderPath: "Dev" },
  { id: "2", parentId: "0", title: "GitLab", url: "https://gitlab.com", dateAdded: 2, folderPath: "Dev" },
  { id: "3", parentId: "0", title: "Kubernetes docs", url: "https://kubernetes.io/docs", dateAdded: 3, folderPath: "Dev" },
  { id: "4", parentId: "0", title: "MDN", url: "https://developer.mozilla.org", dateAdded: 4, folderPath: "Web" },
];

describe("search.buildIndex + query", () => {
  it("matches by title prefix", () => {
    const index = buildIndex(sample);
    const results = query(index, "git");
    expect(results.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("matches by URL substring", () => {
    const index = buildIndex(sample);
    const results = query(index, "kubernetes");
    expect(results.map((r) => r.id)).toContain("3");
  });

  it("fuzzy matches partial words", () => {
    const index = buildIndex(sample);
    const results = query(index, "kuber");
    expect(results.map((r) => r.id)).toContain("3");
  });

  it("respects limit", () => {
    const index = buildIndex(sample);
    const results = query(index, "dev", 1);
    expect(results).toHaveLength(1);
  });

  it("returns empty on empty query", () => {
    const index = buildIndex(sample);
    expect(query(index, "")).toEqual([]);
  });

  it("returns empty on whitespace-only query", () => {
    const index = buildIndex(sample);
    expect(query(index, "   ")).toEqual([]);
  });
});