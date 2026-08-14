const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

/**
 * 规范化 URL 用于去重和比较。
 * - 协议、host 小写
 * - 去除常见追踪参数
 * - 去除 fragment
 * - query 参数按字母排序
 * - 路径去除尾斜杠（根路径除外）
 *
 * 对解析失败的原样返回。
 */
export function normalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input.trim();
  }

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  const params = new URLSearchParams(url.search);
  const filtered = new URLSearchParams();
  for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      filtered.append(key, value);
    }
  }
  url.search = filtered.toString();

  if (url.pathname.endsWith("/") && url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}
