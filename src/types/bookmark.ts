/**
 * 统一的书签模型（与 chrome.bookmarks API 解耦，便于测试）
 */
export interface Bookmark {
  /** chrome.bookmarks.BookmarkTreeNode.id */
  id: string;
  /** chrome.bookmarks.BookmarkTreeNode.parentId */
  parentId: string | null;
  /** chrome.bookmarks.BookmarkTreeNode.title */
  title: string;
  /** chrome.bookmarks.BookmarkTreeNode.url */
  url: string;
  /** chrome.bookmarks.BookmarkTreeNode.dateAdded (ms) */
  dateAdded: number;
  /** 完整文件夹路径，e.g. "Bookmarks bar/Linux" */
  folderPath: string;
}

/**
 * chrome.bookmarks API 返回的原始节点类型
 * 只列出本项目实际使用的字段
 */
export interface ChromeBookmarkNode {
  id: string;
  parentId?: string;
  title?: string;
  url?: string;
  dateAdded?: number;
  children?: ChromeBookmarkNode[];
}
