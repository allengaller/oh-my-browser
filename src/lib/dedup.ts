import { normalizeUrl, siteKey } from "~/lib/url";
import type { Bookmark } from "~/types/bookmark";

/** 重复 URL 分组（规范化 URL 相同的书签组，count ≥ 2） */
export interface DuplicateGroup {
  normalizedUrl: string;
  count: number;
  bookmarks: Bookmark[];
  folders: string[];
  crossFolder: boolean;
}

/** 站点聚合分组（eTLD+1 相同的书签组） */
export interface SiteGroup {
  siteKey: string;
  count: number;
  bookmarks: Bookmark[];
  folders: string[];
  crossFolder: boolean;
}

// 模块级预计算缓存
// scanDuplicates + scanSites 使用同一份 bookmarks 数组时共享一次 URL 解析
interface _UrlKeys {
  normalizedUrl: string;
  siteKey: string | null;
}
let _cacheBookmarks: Bookmark[] | null = null;
const _keyCache = new Map<string, _UrlKeys>();

function _precomputeKeys(bookmarks: Bookmark[]): void {
  if (_cacheBookmarks === bookmarks) return;
  _cacheBookmarks = bookmarks;
  _keyCache.clear();
  for (const b of bookmarks) {
    if (!_keyCache.has(b.url)) {
      _keyCache.set(b.url, {
        normalizedUrl: normalizeUrl(b.url),
        siteKey: siteKey(b.url),
      });
    }
  }
}

function _getKey(b: Bookmark, keyName: "normalizedUrl" | "siteKey"): string | null {
  const entry = _keyCache.get(b.url);
  if (!entry) return null;
  return keyName === "normalizedUrl" ? entry.normalizedUrl : entry.siteKey;
}

function groupBookmarks<T>(
  bookmarks: Bookmark[],
  keyName: "normalizedUrl" | "siteKey",
  minCount = 1,
): T[] {
  _precomputeKeys(bookmarks);
  const groups = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    const key = _getKey(b, keyName);
    if (key === null) continue;
    const list = groups.get(key);
    if (list) list.push(b);
    else groups.set(key, [b]);
  }
  const result: T[] = [];
  for (const [key, bs] of groups) {
    if (bs.length < minCount) continue;
    const folders = [...new Set(bs.map((b) => b.folderPath))].sort();
    const group = {
      [keyName]: key,
      count: bs.length,
      bookmarks: [...bs].sort((a, b) => a.title.localeCompare(b.title)),
      folders,
      crossFolder: folders.length > 1,
    } as T;
    result.push(group);
  }
  result.sort((a, b) => {
    const countDiff = (b as { count: number }).count - (a as { count: number }).count;
    if (countDiff !== 0) return countDiff;
    return ((a as Record<string, string>)[keyName] as string).localeCompare(
      (b as Record<string, string>)[keyName] as string,
    );
  });
  return result;
}

/**
 * 按规范化 URL 扫描重复书签（精确 Map 分组，零误报）。
 * 仅返回 count ≥ 2 的组；按 count 降序、normalizedUrl 字典序排列。
 */
export function scanDuplicates(bookmarks: Bookmark[]): DuplicateGroup[] {
  return groupBookmarks<DuplicateGroup>(bookmarks, "normalizedUrl", 2);
}

/**
 * 按 eTLD+1 聚合站点（子域合并到注册域）。
 * 无法提取 eTLD+1 的书签（localhost、非法 URL）被忽略；
 * 按 count 降序、siteKey 字典序排列。
 */
export function scanSites(bookmarks: Bookmark[]): SiteGroup[] {
  return groupBookmarks<SiteGroup>(bookmarks, "siteKey");
}
