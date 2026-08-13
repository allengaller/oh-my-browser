import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox } from "~/entrypoints/popup/components/SearchBox";

describe("SearchBox", () => {
  it("renders with placeholder", () => {
    render(<SearchBox value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search bookmarks/i)).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/search bookmarks/i);
    await userEvent.type(input, "git");
    expect(onChange).toHaveBeenCalledWith("g");
    expect(onChange).toHaveBeenCalledWith("i");
    expect(onChange).toHaveBeenCalledWith("t");
  });

  it("clears on Escape", async () => {
    const onChange = vi.fn();
    render(<SearchBox value="git" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/search bookmarks/i);
    input.focus();
    await userEvent.keyboard("{Escape}");
    expect(onChange).toHaveBeenCalledWith("");
  });
});
