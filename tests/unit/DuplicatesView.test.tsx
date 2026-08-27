import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DuplicatesView } from "~/entrypoints/popup/components/DuplicatesView";
import type { DuplicateGroup } from "~/lib/dedup";
import type { Bookmark } from "~/types/bookmark";

const bm = (id: string, url: string, folderPath = "Dev", title = `T${id}`): Bookmark => ({
  id,
  parentId: "0",
  title,
  url,
  dateAdded: 1,
  folderPath,
});

describe("DuplicatesView", () => {
  it("shows empty state when no duplicates", () => {
    render(<DuplicatesView groups={[]} onOpen={() => {}} />);
    expect(screen.getByText("没有重复书签")).toBeInTheDocument();
  });

  it("renders duplicate groups with count and cross-folder badge", () => {
    const groups: DuplicateGroup[] = [
      {
        normalizedUrl: "https://example.com/a",
        count: 2,
        bookmarks: [
          bm("1", "https://example.com/a", "Dev"),
          bm("2", "https://example.com/a", "Tools"),
        ],
        folders: ["Dev", "Tools"],
        crossFolder: true,
      },
    ];
    render(<DuplicatesView groups={groups} onOpen={() => {}} />);
    expect(screen.getByText("2×")).toBeInTheDocument();
    expect(screen.getByText("跨文件夹")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/a")).toBeInTheDocument();
  });

  it("opens a bookmark when clicked", () => {
    const onOpen = vi.fn();
    const b = bm("1", "https://example.com/a");
    const groups: DuplicateGroup[] = [
      {
        normalizedUrl: "https://example.com/a",
        count: 2,
        bookmarks: [b, bm("2", "https://example.com/a")],
        folders: ["Dev"],
        crossFolder: false,
      },
    ];
    render(<DuplicatesView groups={groups} onOpen={onOpen} />);
    screen.getByText("T1").click();
    expect(onOpen).toHaveBeenCalledWith(b);
  });
});
