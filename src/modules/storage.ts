import Dexie, { type EntityTable } from "dexie";
import type { Bookmark } from "~/types/bookmark";

class BookmarkDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, "id">;

  constructor() {
    super("oh-my-bookmarks");
    this.version(1).stores({
      bookmarks: "id, parentId, url, dateAdded",
    });
  }
}

let dbInstance: BookmarkDB | null = null;

function getDb(): BookmarkDB {
  if (!dbInstance) {
    dbInstance = new BookmarkDB();
  }
  return dbInstance;
}

/**
 * 仅用于测试：重置单例与底层 IndexedDB。
 * 生产代码不要调用。
 */
export async function _resetDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.delete();
    dbInstance = null;
  }
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  const db = getDb();
  await db.bookmarks.bulkPut(bookmarks);
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = getDb();
  return db.bookmarks.toArray();
}

export async function clear(): Promise<void> {
  const db = getDb();
  await db.bookmarks.clear();
}
