import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "~/entrypoints/popup/components/TabBar";

describe("TabBar", () => {
  it("renders all three tabs", () => {
    render(<TabBar active="search" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "搜索" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "去重" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "站点" })).toBeInTheDocument();
  });

  it("marks the active tab", () => {
    render(<TabBar active="duplicates" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "去重" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "搜索" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange when a tab is clicked", async () => {
    const onChange = vi.fn();
    render(<TabBar active="search" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "站点" }));
    expect(onChange).toHaveBeenCalledWith("sites");
  });
});
