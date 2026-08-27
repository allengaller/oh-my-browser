import { describe, it, expect } from "vitest";
import { normalizeUrl, siteKey } from "~/lib/url";

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
    expect(normalizeUrl("https://example.com/article?utm_source=tw&id=42&fbclid=abc")).toBe(
      "https://example.com/article?id=42",
    );
  });

  it("removes fragment", () => {
    expect(normalizeUrl("https://example.com/page#section-2")).toBe("https://example.com/page");
  });

  it("preserves non-tracking query params (sorted)", () => {
    expect(normalizeUrl("https://example.com/search?q=hello&page=2")).toBe(
      "https://example.com/search?page=2&q=hello",
    );
  });

  it("sorts query parameters alphabetically", () => {
    expect(normalizeUrl("https://example.com?b=2&a=1")).toBe("https://example.com/?a=1&b=2");
  });

  it("handles invalid URLs gracefully by returning the stripped input", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});

describe("url.siteKey", () => {
  it("extracts eTLD+1 from www subdomain", () => {
    expect(siteKey("https://www.solidot.org/story/123")).toBe("solidot.org");
  });

  it("merges subdomains under the same eTLD+1", () => {
    expect(siteKey("http://news.solidot.org/")).toBe("solidot.org");
  });

  it("handles multi-level public suffixes", () => {
    expect(siteKey("https://www.bbc.co.uk/news")).toBe("bbc.co.uk");
  });

  it("handles com.cn public suffix", () => {
    expect(siteKey("https://a.b.example.com.cn/x")).toBe("example.com.cn");
  });

  it("returns null for invalid URLs", () => {
    expect(siteKey("not a url")).toBeNull();
  });

  it("returns null for localhost", () => {
    expect(siteKey("http://localhost:3000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(siteKey("")).toBeNull();
  });
});
