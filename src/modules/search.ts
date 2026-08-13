import MiniSearch, { type SearchResult as MSResult } from "minisearch";
import type { Bookmark } from "~/types/bookmark";

export type SearchIndex = MiniSearch<Bookmark>;
export interface SearchResult {
  id: string;
  score: number;
  bookmark: Bookmark;
}

/**
 * 基于 MiniSearch 构建书签内存索引。
 * 索引字段：title（权重 3）、url（权重 2）、folderPath（权重 1）。
 */
export function buildIndex(bookmarks: Bookmark[]): SearchIndex {
  const index = new MiniSearch<Bookmark>({
    fields: ["title", "url", "folderPath"],
    storeFields: ["title", "url", "folderPath", "dateAdded", "parentId"],
    idField: "id",
    searchOptions: {
      boost: { title: 3, url: 2, folderPath: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  index.addAll(bookmarks);
  return index;
}

export function query(index: SearchIndex, q: string, limit = 10): SearchResult[] {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const results = index.search(trimmed, { combineWith: "OR" });
  return results.slice(0, limit).map((r: MSResult) => ({
    id: String(r.id),
    score: r.score,
    bookmark: {
      id: String(r.id),
      parentId: r.parentId as string | null,
      title: r.title as string,
      url: r.url as string,
      dateAdded: r.dateAdded as number,
      folderPath: r.folderPath as string,
    },
  }));
}