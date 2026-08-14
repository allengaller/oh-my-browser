import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookmarkItem } from "~/entrypoints/popup/components/BookmarkItem";
import type { Bookmark } from "~/types/bookmark";

const bookmark: Bookmark = {
  id: "1",
  parentId: "0",
  title: "GitHub",
  url: "https://github.com",
  dateAdded: 1,
  folderPath: "Dev",
};

describe("BookmarkItem", () => {
  it("renders title and url", () => {
    render(<BookmarkItem bookmark={bookmark} selected={false} onClick={() => {}} />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("https://github.com")).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });

  it("applies selected style when selected", () => {
    const { container } = render(
      <BookmarkItem bookmark={bookmark} selected={true} onClick={() => {}} />,
    );
    expect(container.firstChild).toHaveClass("bg-blue-100");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<BookmarkItem bookmark={bookmark} selected={false} onClick={onClick} />);
    screen.getByText("GitHub").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});