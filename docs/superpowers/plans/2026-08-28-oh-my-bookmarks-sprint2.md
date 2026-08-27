# Oh My Bookmarks Sprint 2 Implementation Plan（去重 + 站点聚合 + 技术债）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付去重 + 站点聚合（popup 内 tab 展示），同时根治 wxt 0.19 modulesDir hack 并修复 E2E CI。

**Architecture:** 三个纯函数模块（`url.siteKey`、`dedup.scanDuplicates`、`dedup.scanSites`）实时计算，popup 内三 tab（搜索/去重/站点）展示。前置两个技术债 Task：`src/modules/` → `src/lib/` 重命名 + 删除 wxt hack；E2E 改用 xvfb 非 headless 恢复硬 gate。

**Tech Stack:** WXT 0.19 + Preact/React 18 + Tailwind 4 + TypeScript 5 strict；tldts（新增，eTLD+1 提取）；Vitest + Testing Library；Playwright + xvfb。

## Global Constraints

- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`（项目 tsconfig 既有配置）
- 每个 Task 的 acceptance criteria **必须显式包含 `pnpm build` 验证**（Sprint 1 教训：Task 17 之前 build 从未验证）
- 性能预算：1,661 条书签 `scanDuplicates` + `scanSites` 合计 < 50ms
- **不修改 chrome.bookmarks**（只读展示；"chrome.bookmarks 唯一真源，扩展只做增强视图"原则）
- 去重算法用**精确 Map**（不用 BloomFilter；spec §3.1 已批准）
- Conventional Commits（`feat:` / `fix:` / `refactor:` / `ci:` / `docs:` / `test:`）
- 完成后 `pnpm lint` 必须通过（Prettier 格式）
- 最终验收 = 本地 `pnpm compile` + `pnpm lint` + `pnpm test` + `pnpm build` 全绿 + **push 后 CI 全绿**（Sprint 1 教训：不能只信本地）

---

### Task A: 根治 wxt hack（src/modules → src/lib）

**Files:**
- Rename: `src/modules/` → `src/lib/`（bookmark-sync.ts, search.ts, storage.ts）
- Modify: `src/entrypoints/popup/App.tsx`（2 处 import）
- Modify: `src/entrypoints/background.ts`（1 处 import）
- Modify: `src/lib/bookmark-sync.ts`（1 处 import）
- Modify: `tests/unit/bookmark-sync.test.ts`（2 处 import）
- Modify: `tests/unit/perf.test.ts`（1 处 import）
- Modify: `tests/unit/search.test.ts`（1 处 import）
- Modify: `tests/unit/storage.test.ts`（1 处 import）
- Modify: `vitest.config.ts`（coverage.include `src/modules/**` → `src/lib/**`）
- Modify: `wxt.config.ts`（删除 `modulesDir` hack 及注释）

**Interfaces:**
- Consumes: 现有 `~/modules/storage`、`~/modules/search`、`~/modules/bookmark-sync` 全部导出（`getDb`、`saveBookmarks`、`getAllBookmarks`、`clear`、`_resetDb`、`syncAll`、`subscribeToChanges`、`buildIndex`、`query`、`SearchResult`）
- Produces: 同接口、新路径 `~/lib/*`；后续 Task C/D/E 一律用 `~/lib/*` import

- [ ] **Step 1: 重命名目录**

```bash
git mv src/modules src/lib
```

- [ ] **Step 2: 更新全部 import 路径**

```bash
grep -rl "~/modules/" src tests --include="*.ts" --include="*.tsx" | xargs sed -i '' 's|~/modules/|~/lib/|g'
grep -rn "~/modules/" src tests --include="*.ts" --include="*.tsx"
```

Expected: 第二条命令无输出（0 处残留）。

- [ ] **Step 3: 更新 vitest.config.ts coverage include**

`vitest.config.ts` 中 `include: ["src/modules/**", ...]` 改为 `include: ["src/lib/**", ...]`。

- [ ] **Step 4: 删除 wxt.config.ts 中的 modulesDir hack**

删除 `wxt.config.ts` 中以下三行（及上方 4 行注释）：

```typescript
  // wxt 0.19 默认扫描 src/modules/ 作为 user modules 目录（通过 jiti 加载），
  // jiti 不识 tsconfig path aliases（如 `~/modules/...`），与项目的 src/modules/ 命名冲突。
  // 指向一个不存在的目录以禁用 wxt 的 user modules 自动扫描；项目代码仍按 src/modules/ 正常组织。
  modulesDir: "./wxt-modules",
```

文件应变为：

```typescript
import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "./src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "oh-my-bookmarks",
    description: "A handy bookmark toolkit for coder.",
    permissions: ["bookmarks", "storage", "tabs"],
    host_permissions: ["<all_urls>"],
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Ctrl+Shift+K",
          mac: "Command+Shift+K",
        },
        description: "Open oh-my-bookmarks popup",
      },
    },
  },
});
```

- [ ] **Step 5: 全量验证**

```bash
pnpm compile
pnpm test
pnpm build
pnpm lint
```

Expected: compile 0 errors；27/27 tests passing；build 成功（WXT 0.19.0，无 jiti alias 报错）；lint 无警告。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "refactor: rename src/modules to src/lib and remove wxt modulesDir hack"
```

---

### Task B: E2E CI 修复（xvfb + 非 headless，恢复硬 gate）

**Files:**
- Modify: `tests/e2e/search.spec.ts`（`headless: !process.env.CI`）
- Modify: `.github/workflows/ci.yml`（e2e job：装 xvfb + `xvfb-run -a`，移除 `continue-on-error`）

**Interfaces:**
- Consumes: Task A 的 build 产物路径 `.output/chrome-mv3`（e2e webServer 已配置 `pnpm build`）
- Produces: CI e2e job 硬性通过（无 `continue-on-error`）

**背景**：Sprint 1 末期确认 Chrome 110+ 移除了 `--headless` 模式的 MV3 扩展支持。修复方案：CI 上用 `xvfb-run -a` 跑非 headless Chromium（`headless: false`），GitHub Actions ubuntu-latest 预装 xvfb；本地保持 headless（sandbox 无法验证 e2e，CI 验证）。

- [ ] **Step 1: 修改 e2e 测试的 headless 参数**

`tests/e2e/search.spec.ts` 中 `launchPersistentContext` 的 `headless: true` 改为：

```typescript
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: !process.env.CI,
      args: ["--disable-extensions-except=" + extensionPath, "--load-extension=" + extensionPath],
    });
```

- [ ] **Step 2: 修改 CI workflow**

`.github/workflows/ci.yml` 中 e2e job：

- 删除整个 `continue-on-error: true` 字段及其上方注释（4 行）
- `E2E tests` step 改为：

```yaml
      - name: E2E tests
        run: xvfb-run -a pnpm test:e2e
```

- [ ] **Step 3: 本地验证（build 侧）**

```bash
pnpm compile
pnpm build
```

Expected: 0 errors；build 成功。（本地 sandbox 无法跑 xvfb e2e，Step 4 在 CI 验证。）

- [ ] **Step 4: 提交并推送验证 CI**

```bash
git add tests/e2e/search.spec.ts .github/workflows/ci.yml
git commit -m "ci: run e2e with xvfb non-headless and restore hard gate"
git push origin master
```

Expected: GitHub Actions CI 全绿（test job + e2e job 均通过；e2e job 无 `continue-on-error`）。

---

### Task C: siteKey（tldts eTLD+1 提取）

**Files:**
- Modify: `package.json`（`pnpm add tldts` 自动更新 + lockfile）
- Modify: `src/lib/url.ts`（新增 `siteKey` 导出）
- Test: `tests/unit/url.test.ts`（扩展 siteKey describe）

**Interfaces:**
- Consumes: 无新依赖（tldts 为新增 dependency）
- Produces: `export function siteKey(input: string): string | null` — 返回 eTLD+1（如 `"solidot.org"`、`"bbc.co.uk"`）；无效 URL / 无公共后缀（如 localhost）/ 解析失败返回 `null`。Task D 依赖此函数。

- [ ] **Step 1: 安装 tldts**

```bash
pnpm add tldts
```

- [ ] **Step 2: 写失败测试**

在 `tests/unit/url.test.ts` 末尾追加：

```typescript
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
```

文件头部 import 增加 `siteKey`：

```typescript
import { normalizeUrl, siteKey } from "~/lib/url";
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm test -- tests/unit/url.test.ts`
Expected: FAIL — `siteKey is not a function` / import 错误。

- [ ] **Step 4: 实现 siteKey**

`src/lib/url.ts` 文件头部添加 import，文件末尾添加函数：

```typescript
import { parse } from "tldts";
```

```typescript
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
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm test -- tests/unit/url.test.ts`
Expected: PASS（8 个既有 + 7 个新增 = 15 个用例）。

- [ ] **Step 6: 全量验证 + 提交**

```bash
pnpm compile
pnpm test
pnpm build
git add src/lib/url.ts tests/unit/url.test.ts package.json pnpm-lock.yaml
git commit -m "feat(url): add siteKey via tldts eTLD+1 extraction"
```

---

### Task D: dedup 模块（scanDuplicates + scanSites）

**Files:**
- Create: `src/lib/dedup.ts`
- Test: `tests/unit/dedup.test.ts`（新建）
- Test: `tests/unit/perf.test.ts`（追加 scan 性能用例）

**Interfaces:**
- Consumes: `normalizeUrl`、`siteKey`（`~/lib/url`，Task C）；`Bookmark`（`~/types/bookmark`）
- Produces:
  ```typescript
  export interface DuplicateGroup {
    normalizedUrl: string;
    count: number; // ≥ 2
    bookmarks: Bookmark[]; // 按 title 字典序
    folders: string[]; // 去重后按字典序
    crossFolder: boolean;
  }
  export interface SiteGroup {
    siteKey: string;
    count: number;
    bookmarks: Bookmark[]; // 按 title 字典序
    folders: string[];
    crossFolder: boolean;
  }
  export function scanDuplicates(bookmarks: Bookmark[]): DuplicateGroup[];
  export function scanSites(bookmarks: Bookmark[]): SiteGroup[];
  ```
  排序规则：`scanDuplicates` 按 count 降序、tie 按 `normalizedUrl` 字典序；`scanSites` 按 count 降序、tie 按 `siteKey` 字典序。Task E 依赖全部导出。

- [ ] **Step 1: 写失败测试**

创建 `tests/unit/dedup.test.ts`：

```typescript
import { describe, it, expect } from "vitest";
import { scanDuplicates, scanSites } from "~/lib/dedup";
import type { Bookmark } from "~/types/bookmark";

const bm = (id: string, url: string, folderPath = "Dev", title = `T${id}`): Bookmark => ({
  id,
  parentId: "0",
  title,
  url,
  dateAdded: Number(id),
  folderPath,
});

describe("dedup.scanDuplicates", () => {
  it("groups bookmarks by normalized URL", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a"),
      bm("2", "https://example.com/a"),
      bm("3", "https://other.com/b"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.normalizedUrl).toBe("https://example.com/a");
    expect(groups[0]!.count).toBe(2);
  });

  it("treats tracking-param variants as duplicates", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a"),
      bm("2", "https://example.com/a?utm_source=x"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.count).toBe(2);
  });

  it("only returns groups with count >= 2", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a"),
      bm("2", "https://example.com/b"),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("marks cross-folder duplicates", () => {
    const groups = scanDuplicates([
      bm("1", "https://example.com/a", "Dev"),
      bm("2", "https://example.com/a", "Tools"),
    ]);
    expect(groups[0]!.crossFolder).toBe(true);
    expect(groups[0]!.folders).toEqual(["Dev", "Tools"]);
  });

  it("sorts by count desc then normalizedUrl asc", () => {
    const groups = scanDuplicates([
      bm("1", "https://aaa.com/x"),
      bm("2", "https://aaa.com/x"),
      bm("3", "https://aaa.com/x"),
      bm("4", "https://bbb.com/y"),
      bm("5", "https://bbb.com/y"),
    ]);
    expect(groups.map((g) => g.normalizedUrl)).toEqual([
      "https://aaa.com/x",
      "https://bbb.com/y",
    ]);
    expect(groups.map((g) => g.count)).toEqual([3, 2]);
  });

  it("returns [] for empty input", () => {
    expect(scanDuplicates([])).toEqual([]);
  });
});

describe("dedup.scanSites", () => {
  it("aggregates subdomains under eTLD+1", () => {
    const sites = scanSites([
      bm("1", "https://www.solidot.org/a"),
      bm("2", "https://news.solidot.org/b"),
      bm("3", "https://github.com/c"),
    ]);
    expect(sites).toHaveLength(2);
    const solidot = sites.find((s) => s.siteKey === "solidot.org")!;
    expect(solidot.count).toBe(2);
    expect(solidot.crossFolder).toBe(false);
  });

  it("handles multi-level public suffixes", () => {
    const sites = scanSites([
      bm("1", "https://www.bbc.co.uk/a"),
      bm("2", "https://news.bbc.co.uk/b"),
    ]);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.siteKey).toBe("bbc.co.uk");
    expect(sites[0]!.count).toBe(2);
  });

  it("ignores bookmarks without a valid site key", () => {
    const sites = scanSites([
      bm("1", "http://localhost:3000"),
      bm("2", "not a url"),
      bm("3", "https://example.com/a"),
    ]);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.siteKey).toBe("example.com");
  });

  it("sorts by count desc then siteKey asc", () => {
    const sites = scanSites([
      bm("1", "https://a.com/x"),
      bm("2", "https://a.com/y"),
      bm("3", "https://z.org/z"),
    ]);
    expect(sites.map((s) => s.siteKey)).toEqual(["a.com", "z.org"]);
  });

  it("returns [] for empty input", () => {
    expect(scanSites([])).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- tests/unit/dedup.test.ts`
Expected: FAIL — `Cannot find module '~/lib/dedup'`。

- [ ] **Step 3: 实现 dedup.ts**

创建 `src/lib/dedup.ts`：

```typescript
import { normalizeUrl, siteKey } from "~/lib/url";
import type { Bookmark } from "~/types/bookmark";

/** 重复 URL 分组（规范化 URL 相同的书签组，count ≥ 2） */
export interface DuplicateGroup {
  normalizedUrl: string;
  count: number;
  bookmarks: Bookmark[];
  folders: string[];
  crossFolder: boolean;
}

/** 站点聚合分组（eTLD+1 相同的书签组） */
export interface SiteGroup {
  siteKey: string;
  count: number;
  bookmarks: Bookmark[];
  folders: string[];
  crossFolder: boolean;
}

function groupBookmarks<T>(
  bookmarks: Bookmark[],
  keyOf: (b: Bookmark) => string | null,
  keyName: "normalizedUrl" | "siteKey",
): T[] {
  const groups = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    const key = keyOf(b);
    if (key === null) continue;
    const list = groups.get(key);
    if (list) list.push(b);
    else groups.set(key, [b]);
  }
  const result: T[] = [];
  for (const [key, bs] of groups) {
    const folders = [...new Set(bs.map((b) => b.folderPath))].sort();
    const group = {
      [keyName]: key,
      count: bs.length,
      bookmarks: [...bs].sort((a, b) => a.title.localeCompare(b.title)),
      folders,
      crossFolder: folders.length > 1,
    } as T;
    result.push(group);
  }
  result.sort((a, b) => {
    const countDiff = (b as { count: number }).count - (a as { count: number }).count;
    if (countDiff !== 0) return countDiff;
    return (a as Record<string, string>)[keyName].localeCompare(
      (b as Record<string, string>)[keyName],
    );
  });
  return result;
}

/**
 * 按规范化 URL 扫描重复书签（精确 Map 分组，零误报）。
 * 仅返回 count ≥ 2 的组；按 count 降序、normalizedUrl 字典序排列。
 */
export function scanDuplicates(bookmarks: Bookmark[]): DuplicateGroup[] {
  return groupBookmarks<DuplicateGroup>(
    bookmarks,
    (b) => normalizeUrl(b.url),
    "normalizedUrl",
  ).filter((g) => g.count >= 2);
}

/**
 * 按 eTLD+1 聚合站点（子域合并到注册域）。
 * 无法提取 eTLD+1 的书签（localhost、非法 URL）被忽略；
 * 按 count 降序、siteKey 字典序排列。
 */
export function scanSites(bookmarks: Bookmark[]): SiteGroup[] {
  return groupBookmarks<SiteGroup>(bookmarks, (b) => siteKey(b.url), "siteKey");
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test -- tests/unit/dedup.test.ts`
Expected: PASS（11 个用例）。

- [ ] **Step 5: 扩展性能测试**

`tests/unit/perf.test.ts` 追加（import 增加）：

```typescript
import { scanDuplicates, scanSites } from "~/lib/dedup";
```

```typescript
  it("scans 1,661 bookmarks (duplicates + sites) in < 50ms", () => {
    const html = readFileSync(
      resolve(process.cwd(), "tests/fixtures/bookmarks_7_5_12.html"),
      "utf-8",
    );
    const bookmarks = parseHtml(html);

    const start = performance.now();
    const dupes = scanDuplicates(bookmarks);
    const sites = scanSites(bookmarks);
    const elapsed = performance.now() - start;

    console.log(
      `Scanned ${bookmarks.length} bookmarks: ${dupes.length} dup groups, ${sites.length} sites in ${elapsed.toFixed(1)}ms`,
    );
    expect(elapsed).toBeLessThan(50);
    // 样本数据：19 个重复 URL；140 条 solidot 子域
    expect(dupes.length).toBeGreaterThan(0);
    expect(sites.some((s) => s.siteKey === "solidot.org")).toBe(true);
  });
```

- [ ] **Step 6: 全量验证 + 提交**

```bash
pnpm compile
pnpm test
pnpm build
pnpm lint
git add src/lib/dedup.ts tests/unit/dedup.test.ts tests/unit/perf.test.ts
git commit -m "feat(dedup): add duplicate scan and site aggregation with TDD"
```

---

### Task E: popup tab UI（搜索 / 去重 / 站点）

**Files:**
- Create: `src/entrypoints/popup/components/TabBar.tsx`
- Create: `src/entrypoints/popup/components/DuplicatesView.tsx`
- Create: `src/entrypoints/popup/components/SitesView.tsx`
- Modify: `src/entrypoints/popup/App.tsx`（tab state + 三视图集成）
- Test: `tests/unit/TabBar.test.tsx`（新建）
- Test: `tests/unit/DuplicatesView.test.tsx`（新建）
- Test: `tests/unit/SitesView.test.tsx`（新建）

**Interfaces:**
- Consumes: `scanDuplicates`、`scanSites`、`DuplicateGroup`、`SiteGroup`（`~/lib/dedup`，Task D）；`Bookmark`（`~/types/bookmark`）
- Produces: `TabBar`（`type Tab = "search" | "duplicates" | "sites"`；props `{ active: Tab; onChange: (tab: Tab) => void }`）；`DuplicatesView`（props `{ groups: DuplicateGroup[]; onOpen: (bookmark: Bookmark) => void }`）；`SitesView`（props `{ sites: SiteGroup[]; onOpen: (bookmark: Bookmark) => void }`）。App.tsx 集成后成为最终交付形态。

- [ ] **Step 1: 写 TabBar 失败测试**

创建 `tests/unit/TabBar.test.tsx`：

```tsx
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
```

- [ ] **Step 2: 写 DuplicatesView 失败测试**

创建 `tests/unit/DuplicatesView.test.tsx`：

```tsx
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
        bookmarks: [bm("1", "https://example.com/a", "Dev"), bm("2", "https://example.com/a", "Tools")],
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
```

- [ ] **Step 3: 写 SitesView 失败测试**

创建 `tests/unit/SitesView.test.tsx`：

```tsx
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
```

- [ ] **Step 4: 运行三个测试确认失败**

Run: `pnpm test -- tests/unit/TabBar.test.tsx tests/unit/DuplicatesView.test.tsx tests/unit/SitesView.test.tsx`
Expected: FAIL — `Cannot find module ... TabBar/DuplicatesView/SitesView`。

- [ ] **Step 5: 实现 TabBar**

创建 `src/entrypoints/popup/components/TabBar.tsx`：

```tsx
export type Tab = "search" | "duplicates" | "sites";

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "search", label: "搜索" },
  { id: "duplicates", label: "去重" },
  { id: "sites", label: "站点" },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex border-b border-gray-200" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            active === t.id
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 实现 DuplicatesView**

创建 `src/entrypoints/popup/components/DuplicatesView.tsx`：

```tsx
import type { DuplicateGroup } from "~/lib/dedup";
import type { Bookmark } from "~/types/bookmark";
import { EmptyState } from "./EmptyState";

interface DuplicatesViewProps {
  groups: DuplicateGroup[];
  onOpen: (bookmark: Bookmark) => void;
}

export function DuplicatesView({ groups, onOpen }: DuplicatesViewProps) {
  if (groups.length === 0) {
    return <EmptyState title="没有重复书签" subtitle="所有书签 URL 都是唯一的" />;
  }
  return (
    <ul>
      {groups.map((g) => (
        <li key={g.normalizedUrl} className="border-b border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600">{g.count}×</span>
            <span className="text-sm text-gray-800 truncate">{g.normalizedUrl}</span>
            {g.crossFolder && (
              <span className="text-[10px] text-amber-600 shrink-0">跨文件夹</span>
            )}
          </div>
          <ul className="mt-1">
            {g.bookmarks.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => onOpen(b)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 flex justify-between gap-2"
                >
                  <span className="text-sm truncate">{b.title}</span>
                  <span className="text-xs text-gray-400 truncate shrink-0">{b.folderPath}</span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: 实现 SitesView**

创建 `src/entrypoints/popup/components/SitesView.tsx`：

```tsx
import { useState } from "react";
import type { SiteGroup } from "~/lib/dedup";
import type { Bookmark } from "~/types/bookmark";
import { EmptyState } from "./EmptyState";

interface SitesViewProps {
  sites: SiteGroup[];
  onOpen: (bookmark: Bookmark) => void;
}

export function SitesView({ sites, onOpen }: SitesViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (sites.length === 0) {
    return <EmptyState title="没有站点数据" subtitle="书签库为空或全部无法解析" />;
  }

  return (
    <ul>
      {sites.map((s) => (
        <li key={s.siteKey} className="border-b border-gray-100">
          <button
            onClick={() => setExpanded(expanded === s.siteKey ? null : s.siteKey)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
          >
            <span
              className={`text-xs transition-transform ${expanded === s.siteKey ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <span className="text-sm font-medium text-gray-800">{s.siteKey}</span>
            <span className="text-xs text-gray-500">{s.count} 条</span>
            {s.crossFolder && <span className="text-[10px] text-amber-600">跨文件夹</span>}
          </button>
          {expanded === s.siteKey && (
            <ul className="pb-1">
              {s.bookmarks.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => onOpen(b)}
                    className="w-full text-left pl-8 pr-3 py-1 hover:bg-gray-100 flex justify-between gap-2"
                  >
                    <span className="text-sm truncate">{b.title}</span>
                    <span className="text-xs text-gray-400 truncate shrink-0">{b.folderPath}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 8: 集成到 App.tsx**

将 `src/entrypoints/popup/App.tsx` 整体替换为：

```tsx
import { useEffect, useState, useMemo } from "react";
import { SearchBox } from "./components/SearchBox";
import { BookmarkItem } from "./components/BookmarkItem";
import { EmptyState } from "./components/EmptyState";
import { TabBar, type Tab } from "./components/TabBar";
import { DuplicatesView } from "./components/DuplicatesView";
import { SitesView } from "./components/SitesView";
import { getAllBookmarks } from "~/lib/storage";
import { buildIndex, query, type SearchResult } from "~/lib/search";
import { scanDuplicates, scanSites } from "~/lib/dedup";
import type { Bookmark } from "~/types/bookmark";

export function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tab, setTab] = useState<Tab>("search");
  const [queryStr, setQueryStr] = useState("");
  const [selected, setSelected] = useState(0);

  // 启动时加载
  useEffect(() => {
    getAllBookmarks().then(setBookmarks);
  }, []);

  const index = useMemo(() => buildIndex(bookmarks), [bookmarks]);
  const results: SearchResult[] = useMemo(() => query(index, queryStr), [index, queryStr]);
  const duplicateGroups = useMemo(() => scanDuplicates(bookmarks), [bookmarks]);
  const siteGroups = useMemo(() => scanSites(bookmarks), [bookmarks]);

  // query / tab 变化时重置 selection
  useEffect(() => {
    setSelected(0);
  }, [queryStr, tab]);

  const openBookmark = (b: Bookmark) => {
    chrome.tabs.create({ url: b.url });
    window.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 键盘导航仅搜索 tab 生效
    if (tab !== "search") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      openBookmark(results[selected]!.bookmark);
    }
  };

  return (
    <div className="w-[420px]" onKeyDown={handleKeyDown}>
      <div className="p-3 border-b border-gray-200">
        <SearchBox value={queryStr} onChange={setQueryStr} />
      </div>
      <TabBar active={tab} onChange={setTab} />
      <div className="max-h-96 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <EmptyState
            title="Loading bookmarks..."
            subtitle="If this persists, check Service Worker console"
          />
        ) : tab === "search" ? (
          results.length === 0 ? (
            <EmptyState
              title={queryStr ? "No matches" : "Type to search"}
              subtitle={queryStr ? "Try a different keyword" : "1,661 bookmarks indexed"}
            />
          ) : (
            results.map((r, i) => (
              <BookmarkItem
                key={r.id}
                bookmark={r.bookmark}
                selected={i === selected}
                onClick={() => openBookmark(r.bookmark)}
              />
            ))
          )
        ) : tab === "duplicates" ? (
          <DuplicatesView groups={duplicateGroups} onOpen={openBookmark} />
        ) : (
          <SitesView sites={siteGroups} onOpen={openBookmark} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: 运行全部测试**

Run: `pnpm test`
Expected: PASS（既有 27 + 新增 9 = 36 个用例）。

- [ ] **Step 10: 全量验证 + 提交**

```bash
pnpm compile
pnpm build
pnpm lint
git add src/entrypoints/popup/components/TabBar.tsx src/entrypoints/popup/components/DuplicatesView.tsx src/entrypoints/popup/components/SitesView.tsx src/entrypoints/popup/App.tsx tests/unit/TabBar.test.tsx tests/unit/DuplicatesView.test.tsx tests/unit/SitesView.test.tsx
git commit -m "feat(popup): add duplicates and sites tabs with TDD"
```

---

### Task F: 收官（全量验证 + spec 状态 + CI 验证）

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-oh-my-bookmarks-sprint2-design.md`（状态字段）
- Modify: `docs/superpowers/specs/2026-08-13-oh-my-bookmarks-design.md`（状态字段）

**Interfaces:**
- Consumes: Task A-E 全部产出
- Produces: Sprint 2 完成状态 + CI 全绿证据

- [ ] **Step 1: 全量本地验证**

```bash
pnpm compile
pnpm lint
pnpm test
pnpm build
```

Expected: 全部通过；`pnpm test` 显示 36/36 passing；perf 输出 scan < 50ms。

- [ ] **Step 2: 更新 spec 状态**

`docs/superpowers/specs/2026-08-28-oh-my-bookmarks-sprint2-design.md` 第 4 行 `**状态**：Draft v1（brainstorming 评审通过，待用户最终评审）` 改为：

```markdown
**状态**：Sprint 2 已完成
```

`docs/superpowers/specs/2026-08-13-oh-my-bookmarks-design.md` 第 4 行 `**状态**：Sprint 0+1 已完成` 改为：

```markdown
**状态**：Sprint 0-2 已完成
```

- [ ] **Step 3: 提交**

```bash
git add docs/superpowers/specs/
git commit -m "docs: mark Sprint 2 complete"
```

- [ ] **Step 4: 推送并验证 CI**

```bash
git push origin master
```

Expected: GitHub Actions CI 全绿——test job（Type check + Lint + Unit tests + Build）✅ + e2e job（xvfb 非 headless）✅，无 `continue-on-error`。

- [ ] **Step 5: 记录结果**

在 commit message / 汇报中记录：36/36 tests；perf scan 耗时；e2e CI 通过证据；wxt hack 移除证据（`pnpm build` 无 workaround）。

---

## Self-Review

- **Spec coverage**：spec §2.1 范围 4 项 → Task A（wxt 根治）、Task B（E2E CI）、Task C（siteKey）、Task D（dedup）、Task E（tab UI）、Task F（收官）；§1.3 成功标准 5 项 → 每项均有对应验证步骤；§4.1 文件清单 → 全部覆盖
- **Placeholder scan**：无 TBD/TODO；所有测试与实现代码完整给出
- **Type consistency**：`DuplicateGroup`/`SiteGroup`/`scanDuplicates`/`scanSites`/`siteKey` 在 Task C/D 定义后 Task D/E 引用一致；`Tab` 类型在 TabBar 定义后 App 引用一致；`Bookmark` 全程复用既有类型
- **Sprint 1 教训落地**：每个 Task 的验证步骤均含 `pnpm build`；Task B/F 含 `git push` 后 CI 验证
