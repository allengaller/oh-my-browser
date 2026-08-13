import { describe, it, expect } from "vitest";
import { normalizeUrl } from "~/utils/url";

describe("normalizeUrl", () => {
  it("lowercases the protocol and host", () => {
    expect(normalizeUrl("HTTPS://Example.COM/path")).toBe("https://example.com/path");
  });

  it("removes trailing slash from path", () => {
    expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
  });

  it("keeps root path slash", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("removes common tracking parameters", () => {
    expect(
      normalizeUrl("https://example.com/article?utm_source=tw&id=42&fbclid=abc"),
    ).toBe("https://example.com/article?id=42");
  });

  it("removes fragment", () => {
    expect(normalizeUrl("https://example.com/page#section-2")).toBe("https://example.com/page");
  });

  it("preserves query parameters that are not tracking", () => {
    expect(normalizeUrl("https://example.com/search?q=hello&page=2")).toBe(
      "https://example.com/search?q=hello&page=2",
    );
  });

  it("sorts query parameters alphabetically", () => {
    expect(normalizeUrl("https://example.com?b=2&a=1")).toBe("https://example.com?a=1&b=2");
  });

  it("handles invalid URLs gracefully by returning the stripped input", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});
