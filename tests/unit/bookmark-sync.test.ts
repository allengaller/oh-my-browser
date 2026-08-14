import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { getAllBookmarks, _resetDb } from "~/modules/storage";
import { syncAll } from "~/modules/bookmark-sync";
import type { ChromeBookmarkNode } from "~/types/bookmark";

const TREE: ChromeBookmarkNode[] = [
  {
    id: "0",
    title: "",
    children: [
      {
        id: "1",
        parentId: "0",
        title: "Bookmarks bar",
        children: [
          {
            id: "10",
            parentId: "1",
            title: "Dev",
            children: [
              {
                id: "100",
                parentId: "10",
                title: "GitHub",
                url: "https://github.com",
                dateAdded: 1700000000000,
              },
            ],
          },
          {
            id: "11",
            parentId: "1",
            title: "MDN",
            url: "https://developer.mozilla.org",
            dateAdded: 1700000001000,
          },
        ],
      },
    ],
  },
];

function installChromeMock(tree: ChromeBookmarkNode[]) {
  (globalThis as any).chrome = {
    bookmarks: {
      getTree: vi.fn().mockResolvedValue(tree),
      onCreated: { addListener: vi.fn() },
      onChanged: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
    },
  };
}

beforeEach(async () => {
  await _resetDb();
});

describe("bookmark-sync", () => {
  it("syncs the full tree into IndexedDB", async () => {
    installChromeMock(TREE);
    const synced = await syncAll();
    expect(synced).toHaveLength(2);

    const stored = await getAllBookmarks();
    expect(stored).toHaveLength(2);
    expect(stored[0]!.folderPath).toBe("Bookmarks bar/Dev");
    expect(stored[1]!.folderPath).toBe("Bookmarks bar");
  });

  it("skips nodes without url (folders) but indexes folderPath", async () => {
    installChromeMock(TREE);
    const synced = await syncAll();
    const github = synced.find((b) => b.id === "100");
    expect(github?.folderPath).toBe("Bookmarks bar/Dev");
  });
});
