import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { saveBookmarks, getAllBookmarks, clear, _resetDb } from "~/modules/storage";
import type { Bookmark } from "~/types/bookmark";

const sample: Bookmark[] = [
  {
    id: "1",
    parentId: "0",
    title: "GitHub",
    url: "https://github.com",
    dateAdded: 1700000000000,
    folderPath: "Bookmarks bar/Dev",
  },
  {
    id: "2",
    parentId: "0",
    title: "MDN",
    url: "https://developer.mozilla.org",
    dateAdded: 1700000001000,
    folderPath: "Bookmarks bar/Dev",
  },
];

beforeEach(async () => {
  await _resetDb();
  await clear();
});

describe("storage", () => {
  it("saves and retrieves bookmarks", async () => {
    await saveBookmarks(sample);
    const all = await getAllBookmarks();
    expect(all).toHaveLength(2);
    expect(all[0]!.title).toBe("GitHub");
  });

  it("upserts existing bookmarks by id", async () => {
    await saveBookmarks(sample);
    await saveBookmarks([{ ...sample[0]!, title: "GitHub - Updated" }]);
    const all = await getAllBookmarks();
    expect(all).toHaveLength(2);
    expect(all.find((b) => b.id === "1")?.title).toBe("GitHub - Updated");
  });

  it("clears all bookmarks", async () => {
    await saveBookmarks(sample);
    await clear();
    const all = await getAllBookmarks();
    expect(all).toHaveLength(0);
  });
});
