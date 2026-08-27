import { parse } from "tldts";

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
  // Manual URL parsing to avoid slow jsdom URL constructor (~312ms for 1663 URLs).
  const trimmed = input.trim();
  const protoEnd = trimmed.indexOf("://");
  if (protoEnd < 0) return trimmed;

  const protocol = trimmed.substring(0, protoEnd + 3).toLowerCase();
  const rest = trimmed.substring(protoEnd + 3);

  // Split host from rest at first '/', '?', or '#'
  const slashIdx = rest.indexOf("/");
  const qIdx = rest.indexOf("?");
  const hIdx = rest.indexOf("#");
  const splitIdx = Math.min(
    slashIdx >= 0 ? slashIdx : Infinity,
    qIdx >= 0 ? qIdx : Infinity,
    hIdx >= 0 ? hIdx : Infinity,
  );

  const host =
    splitIdx === Infinity ? rest.toLowerCase() : rest.substring(0, splitIdx).toLowerCase();
  let pathAndQuery = splitIdx === Infinity ? "" : rest.substring(splitIdx);

  // Strip hash
  const hashIdx = pathAndQuery.indexOf("#");
  if (hashIdx >= 0) pathAndQuery = pathAndQuery.substring(0, hashIdx);

  let path: string;
  let queryStr: string;

  if (!pathAndQuery) {
    path = "/";
    queryStr = "";
  } else if (pathAndQuery.startsWith("?")) {
    path = "/";
    queryStr = pathAndQuery.substring(1);
  } else {
    const pqSplit = pathAndQuery.indexOf("?");
    if (pqSplit >= 0) {
      path = pathAndQuery.substring(0, pqSplit);
      queryStr = pathAndQuery.substring(pqSplit + 1);
    } else {
      path = pathAndQuery;
      queryStr = "";
    }
    if (path.endsWith("/") && path !== "/" && path.length > 1) {
      path = path.replace(/\/+$/, "");
    }
  }

  let result = protocol + host + path;

  if (queryStr) {
    const params = new URLSearchParams(queryStr);
    if (params.size > 0) {
      const filtered = new URLSearchParams();
      for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (!TRACKING_PARAMS.has(key.toLowerCase())) {
          filtered.append(key, value);
        }
      }
      const cleanQuery = filtered.toString();
      if (cleanQuery) result += "?" + cleanQuery;
    }
  }

  return result;
}

/**
 * 提取 URL 的 eTLD+1（可有效注册域名），用于站点聚合。
 * 例：https://www.solidot.org/story → "solidot.org"
 *     https://www.bbc.co.uk/news → "bbc.co.uk"
 * 对无法解析的 URL（非法 URL、localhost 等）返回 null。
 */
export function siteKey(input: string): string | null {
  try {
    return parse(input).domain ?? null;
  } catch {
    return null;
  }
}
