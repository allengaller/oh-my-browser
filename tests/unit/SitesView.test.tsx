import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SitesView } from "~/entrypoints/popup/components/SitesView";
import type { SiteGroup } from "~/lib/dedup";
import type { Bookmark } from "~/types/bookmark";

const bm = (id: string, url: string, title = `T${id}`, folderPath = "Dev"): Bookmark => ({
  id,
  parentId: "0",
  title,
  url,
  dateAdded: 1,
  folderPath,
});

describe("SitesView", () => {
  it("shows empty state when no sites", () => {
    render(<SitesView sites={[]} onOpen={() => {}} />);
    expect(screen.getByText("没有站点数据")).toBeInTheDocument();
  });

  it("renders sites with count and expands on click", async () => {
    const sites: SiteGroup[] = [
      {
        siteKey: "solidot.org",
        count: 2,
        bookmarks: [bm("1", "https://www.solidot.org/a"), bm("2", "https://news.solidot.org/b")],
        folders: ["Linux", "News"],
        crossFolder: true,
      },
    ];
    render(<SitesView sites={sites} onOpen={() => {}} />);
    expect(screen.getByText("solidot.org")).toBeInTheDocument();
    expect(screen.getByText("2 条")).toBeInTheDocument();
    expect(screen.queryByText("T1")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("solidot.org"));
    expect(screen.getByText("T1")).toBeInTheDocument();
    expect(screen.getByText("T2")).toBeInTheDocument();
  });

  it("opens a bookmark when clicked after expand", async () => {
    const onOpen = vi.fn();
    const b = bm("1", "https://solidot.org/a", "T1");
    const sites: SiteGroup[] = [
      { siteKey: "solidot.org", count: 1, bookmarks: [b], folders: ["Dev"], crossFolder: false },
    ];
    render(<SitesView sites={sites} onOpen={onOpen} />);
    await userEvent.click(screen.getByText("solidot.org"));
    screen.getByText("T1").click();
    expect(onOpen).toHaveBeenCalledWith(b);
  });
});
