import { getDb } from "~/lib/storage";
import type { Bookmark, ChromeBookmarkNode } from "~/types/bookmark";

/**
 * 递归遍历书签树，收集所有书签（带文件夹路径）。
 */
function flatten(
  nodes: ChromeBookmarkNode[],
  parentPath: string[] = [],
  out: Bookmark[] = [],
): Bookmark[] {
  for (const node of nodes) {
    const folderPath = parentPath.length > 0 ? parentPath.join("/") : "";
    if (node.url) {
      out.push({
        id: node.id,
        parentId: node.parentId ?? null,
        title: node.title ?? "",
        url: node.url,
        dateAdded: node.dateAdded ?? 0,
        folderPath,
      });
    } else if (node.children) {
      const nextPath = node.title ? [...parentPath, node.title] : parentPath;
      flatten(node.children, nextPath, out);
    }
  }
  return out;
}

/**
 * 从 chrome.bookmarks API 同步全量书签到 IndexedDB。
 * 返回同步的书签数。
 */
export async function syncAll(): Promise<Bookmark[]> {
  const tree = (await chrome.bookmarks.getTree()) as ChromeBookmarkNode[];
  // 根节点 children 是顶层，整个树的第一层（id="0"）title 为空，不计入路径
  const root = tree[0]!;
  const bookmarks = flatten(root.children ?? [], [], []);

  const db = getDb();
  await db.transaction("rw", db.bookmarks, async () => {
    await db.bookmarks.clear();
    await db.bookmarks.bulkPut(bookmarks);
  });

  return bookmarks;
}

type ChangeCallback = () => void;

/**
 * 订阅书签变更（创建/修改/删除），返回 unsubscribe。
 */
export function subscribeToChanges(callback: ChangeCallback): () => void {
  const handleChange = () => callback();
  chrome.bookmarks.onCreated.addListener(handleChange);
  chrome.bookmarks.onChanged.addListener(handleChange);
  chrome.bookmarks.onRemoved.addListener(handleChange);
  return () => {
    chrome.bookmarks.onCreated.removeListener(handleChange);
    chrome.bookmarks.onChanged.removeListener(handleChange);
    chrome.bookmarks.onRemoved.removeListener(handleChange);
  };
}
