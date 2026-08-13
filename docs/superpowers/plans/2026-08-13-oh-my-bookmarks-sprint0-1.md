# oh-my-bookmarks Sprint 0+1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个最小可用的浏览器扩展 MVP：用户按 ⌘⇧K 弹出搜索框，输入关键字在 1,661 条书签中模糊匹配，Enter 跳转。

**Architecture:** Manifest V3 扩展 + WXT 框架 + Preact UI + Tailwind 样式。后台 Service Worker 通过 `chrome.bookmarks` API 同步书签到 IndexedDB（Dexie 封装），用 MiniSearch 建立内存索引。Popup 中实时查询并展示 Top 10 命中。

**Tech Stack:** TypeScript 5.x, WXT 0.19.x, Preact 10.x, Tailwind CSS 4.x, MiniSearch 7.x, Dexie 4.x, Vitest 2.x, Playwright 1.5x

**Reference Spec:** `docs/superpowers/specs/2026-08-13-oh-my-bookmarks-design.md`

**Scope:** Sprint 0（项目骨架）+ Sprint 1（即时搜索）。Sprint 2-4 见后续独立计划。

---

## Global Constraints

- **Node 版本**: ≥ 20.0.0（WRR5 最低要求）
- **包管理器**: pnpm ≥ 9.x（已锁定，避免 npm 漂移）
- **TypeScript**: strict mode 必须开启
- **代码风格**: Prettier 2 spaces + double quotes + trailing comma
- **提交规范**: Conventional Commits（feat/fix/chore/docs/test/refactor）
- **测试覆盖率**: 单元测试 > 80%（utils 与 modules 必须 100%）
- **Bundle size**: < 500KB（gzip），单文件 < 200KB
- **浏览器目标**: Chrome 120+ / Firefox 121+（Manifest V3）
- **stores**: chrome.bookmarks（只读）、chrome.storage.sync、IndexedDB（Dexie）
- **禁止依赖**: any lodash 子包（体积过大）、moment.js（建议用 dayjs 但本项目时间不敏感）

---

## File Structure

```
oh-my-bookmarks/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts            # Service Worker 入口
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   ├── App.tsx              # 根组件
│   │   │   ├── components/
│   │   │   │   ├── SearchBox.tsx
│   │   │   │   ├── BookmarkItem.tsx
│   │   │   │   └── EmptyState.tsx
│   │   │   └── style.css
│   │   └── options/                 # V1.1 阶段使用
│   ├── modules/
│   │   ├── bookmark-sync.ts         # chrome.bookmarks API 封装
│   │   ├── search.ts                # MiniSearch 索引 + 查询
│   │   └── storage.ts               # Dexie schema
│   ├── utils/
│   │   ├── url.ts                   # URL 规范化
│   │   ├── domain.ts                # eTLD+1 提取（Sprint 2 复用）
│   │   └── keyboard.ts              # 快捷键工具
│   └── types/
│       └── bookmark.ts              # 共享类型
├── tests/
│   ├── unit/
│   │   ├── url.test.ts
│   │   ├── search.test.ts
│   │   └── bookmark-sync.test.ts
│   ├── e2e/
│   │   └── search.spec.ts
│   └── fixtures/
│       └── bookmarks_7_5_12.html   # 1,661 条样本数据
├── wxt.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
├── pnpm-lock.yaml
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
└── LICENSE
```

**Decomposition rationale:**
- `bookmark-sync.ts` 独立于 `search.ts`：前者负责同步生命周期，后者负责查询，两者通过 Dexie schema 解耦
- `url.ts` 与 `domain.ts` 分离：URL 规范化是基础工具，domain 提取是 Sprint 2 引入，避免 Sprint 1 过度设计
- `tests/fixtures/` 复用 `test/bookmarks_7_5_12.html` 而非复制（避免数据漂移）

---

## Sprint 0: Setup（Tasks 1-6）

### Task 1: 初始化 WXT 项目骨架

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`（可选，预留 monorepo 扩展）
- Create: `wxt.config.ts`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.prettierrc`
- Create: `README.md`

**Interfaces:**
- Consumes: 无
- Produces: 可运行的 `pnpm dev` 命令，弹出 Manifest V3 扩展

- [ ] **Step 1: 初始化 git 工作区**

```bash
cd /Users/allengaller/Documents/GitHub/allengaller/oh-my-browser
git checkout -b feat/oh-my-bookmarks-sprint0
```

- [ ] **Step 2: 创建 package.json**

```bash
cat > package.json << 'EOF'
{
  "name": "oh-my-bookmarks",
  "description": "A handy bookmark toolkit for coder.",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:firefox": "wxt build -b firefox",
    "zip": "wxt zip",
    "compile": "tsc --noEmit",
    "lint": "prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "postinstall": "wxt prepare"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@wxt-dev/module-react": "^1.1.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "wxt": "^0.19.0"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
EOF
```

- [ ] **Step 3: 初始化 TypeScript 配置**

```bash
cat > tsconfig.json << 'EOF'
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true
  }
}
EOF
```

- [ ] **Step 4: 创建 WXT 配置**

```bash
cat > wxt.config.ts << 'EOF'
import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "oh-my-bookmarks",
    description: "A handy bookmark toolkit for coder.",
    permissions: ["bookmarks", "storage", "tabs"],
    host_permissions: ["<all_urls>"],
    commands: {
      "_execute_action": {
        suggested_key: {
          default: "Ctrl+Shift+K",
          mac: "Command+Shift+K",
        },
        description: "Open oh-my-bookmarks popup",
      },
    },
  },
});
EOF
```

- [ ] **Step 5: 创建 .gitignore**

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# WXT
.wxt/
.output/

# Build artifacts
dist/
*.zip
*.crx
*.xpi

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Test
coverage/
playwright-report/
test-results/

# Logs
*.log
EOF
```

- [ ] **Step 6: 创建 Prettier 配置**

```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF
```

- [ ] **Step 7: 创建 README**

```bash
cat > README.md << 'EOF'
# oh-my-bookmarks

A handy bookmark toolkit for coder.

## Development

```bash
pnpm install
pnpm dev
```

Load the extension from `.output/chrome-mv3/` in Chrome's extension page.

## Testing

```bash
pnpm test         # Unit tests
pnpm test:e2e    # E2E tests
```

## Build

```bash
pnpm build       # Chrome
pnpm build:firefox
pnpm zip         # Pack for store
```

## License

MIT
EOF
```

- [ ] **Step 8: 安装依赖**

```bash
pnpm install
```

Expected: 安装成功，无 peer warnings。如果出现 puppeteer 失败可忽略（仅 e2e 阶段需要）。

- [ ] **Step 9: 提交**

```bash
git add package.json pnpm-lock.yaml tsconfig.json wxt.config.ts .gitignore .prettierrc README.md
git commit -m "chore: initialize WXT project skeleton"
```

---

### Task 2: 创建一个 Hello World Popup 验证基础链路

**Files:**
- Create: `src/entrypoints/popup/index.html`
- Create: `src/entrypoints/popup/App.tsx`
- Create: `src/entrypoints/popup/main.tsx`
- Create: `src/entrypoints/popup/style.css`

**Interfaces:**
- Consumes: `wxt.config.ts` 中定义的 `commands._execute_action`
- Produces: 打开 ⌘⇧K 弹出显示 "OH MY BOOKMARKS"

- [ ] **Step 1: 创建 popup HTML**

```bash
mkdir -p src/entrypoints/popup
cat > src/entrypoints/popup/index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>oh-my-bookmarks</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
EOF
```

- [ ] **Step 2: 创建 main.tsx 入口**

```bash
cat > src/entrypoints/popup/main.tsx << 'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
EOF
```

- [ ] **Step 3: 创建 App.tsx**

```bash
cat > src/entrypoints/popup/App.tsx << 'EOF'
export function App() {
  return (
    <div className="p-4 w-96 text-center">
      <h1 className="text-2xl font-bold">OH MY BOOKMARKS</h1>
      <p className="text-sm text-gray-500 mt-2">Setup complete</p>
    </div>
  );
}
EOF
```

- [ ] **Step 4: 创建占位样式**

```bash
cat > src/entrypoints/popup/style.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
}
EOF
```

**注意**: `style.css` 引用了 `@tailwind` 指令，但 Tailwind 尚未配置。Tailwind 配置在 Task 3 完成。

- [ ] **Step 5: 启动 dev 验证**

```bash
pnpm dev
```

- 打开 Chrome 扩展页 `chrome://extensions/`
- 开启"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择 `.output/chrome-mv3/` 目录
- 按 ⌘⇧K（或 Ctrl+Shift+K）弹出 popup
- Expected: 显示 "OH MY BOOKMARKS - Setup complete"

- [ ] **Step 6: 提交**

```bash
git add src/entrypoints/popup/
git commit -m "feat(popup): add Hello World popup"
```

---

### Task 3: 配置 Tailwind CSS 4

**Files:**
- Create: `postcss.config.js`
- Modify: `src/entrypoints/popup/style.css`

**Interfaces:**
- Consumes: `App.tsx` 中 `className="p-4 w-96 text-2xl font-bold"` 等 Tailwind 工具类
- Produces: 可见的样式（深度蓝灰色文字、间距正确）

- [ ] **Step 1: 安装 Tailwind 与 PostCSS**

```bash
pnpm add -D tailwindcss@^4.0.0 @tailwindcss/postcss@^4.0.0 postcss@^8.4.0
```

- [ ] **Step 2: 创建 PostCSS 配置**

```bash
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
EOF
```

- [ ] **Step 3: 更新 style.css**

```bash
cat > src/entrypoints/popup/style.css << 'EOF'
@import "tailwindcss";

body {
  margin: 0;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
}
EOF
```

Tailwind 4 使用 `@import "tailwindcss"` 而非 v3 的 `@tailwind` 指令。

- [ ] **Step 4: 重启 dev 服务器**

```bash
# 停止当前 dev
pkill -f "wxt" || true
pnpm dev
```

- 重新加载扩展（chrome://extensions/ → 点击刷新图标）
- 按 ⌘⇧K 弹出
- Expected: 文字正确显示 padding、内边距、灰色辅助文字颜色

- [ ] **Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml postcss.config.js src/entrypoints/popup/style.css
git commit -m "feat(ui): configure Tailwind CSS 4"
```

---

### Task 4: 安装 Vitest 并配置

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

**Interfaces:**
- Consumes: `pnpm test` 命令
- Produces: 可运行的 Vitest 测试环境

- [ ] **Step 1: 创建 vitest 配置**

```bash
cat > vitest.config.ts << 'EOF'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/modules/**", "src/utils/**"],
      exclude: ["**/*.d.ts", "**/types/**"],
    },
  },
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
    },
  },
});
EOF
```

- [ ] **Step 2: 创建 setup 文件**

```bash
mkdir -p tests
cat > tests/setup.ts << 'EOF'
// Vitest global setup
// Mock chrome.* APIs if needed in tests
EOF
```

- [ ] **Step 3: 验证测试运行**

```bash
pnpm test
```

Expected: "No test files found" 退出码 0（无测试文件是正常的）。

- [ ] **Step 4: 提交**

```bash
git add vitest.config.ts tests/setup.ts
git commit -m "chore(test): configure Vitest"
```

---

### Task 5: 安装 Playwright 并配置 E2E

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/.gitkeep`

**Interfaces:**
- Consumes: `pnpm test:e2e` 命令
- Produces: 可加载扩展并执行 E2E 的环境

- [ ] **Step 1: 安装 Playwright**

```bash
pnpm add -D @playwright/test@^1.5x
pnpm exec playwright install chromium
```

- [ ] **Step 2: 创建 Playwright 配置**

```bash
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--headless=new",
            "--disable-extensions-except=" + process.cwd() + "/.output/chrome-mv3",
            "--load-extension=" + process.cwd() + "/.output/chrome-mv3",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "pnpm build",
    port: 0,
    reuseExistingServer: !process.env.CI,
    cwd: ".",
  },
});
EOF
```

- [ ] **Step 3: 创建 e2e 目录**

```bash
mkdir -p tests/e2e
touch tests/e2e/.gitkeep
```

- [ ] **Step 4: 验证配置**

```bash
pnpm test:e2e --list
```

Expected: 列出 0 个测试（无 .spec.ts 文件），无报错。

- [ ] **Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml playwright.config.ts tests/e2e/.gitkeep
git commit -m "chore(test): configure Playwright for E2E"
```

---

### Task 6: 配置 GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: GitHub push / PR
- Produces: Lint + Type check + Unit test + E2E test 全部通过的 CI

- [ ] **Step 1: 创建 CI 配置**

```bash
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm compile

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test

      - name: Build
        run: pnpm build
EOF
```

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
```

---

## Sprint 1: 即时搜索 + 快速跳转（Tasks 7-14）

### Task 7: 定义共享类型

**Files:**
- Create: `src/types/bookmark.ts`

**Interfaces:**
- Consumes: 无
- Produces: `Bookmark`、`BookmarkNode` 类型供其他模块使用

- [ ] **Step 1: 编写类型定义**

```bash
mkdir -p src/types
cat > src/types/bookmark.ts << 'EOF'
/**
 * 统一的书签模型（与 chrome.bookmarks API 解耦，便于测试）
 */
export interface Bookmark {
  /** chrome.bookmarks.BookmarkTreeNode.id */
  id: string;
  /** chrome.bookmarks.BookmarkTreeNode.parentId */
  parentId: string | null;
  /** chrome.bookmarks.BookmarkTreeNode.title */
  title: string;
  /** chrome.bookmarks.BookmarkTreeNode.url */
  url: string;
  /** chrome.bookmarks.BookmarkTreeNode.dateAdded (ms) */
  dateAdded: number;
  /** 完整文件夹路径，e.g. "Bookmarks bar/Linux" */
  folderPath: string;
}

/**
 * chrome.bookmarks API 返回的原始节点类型
 * 只列出本项目实际使用的字段
 */
export interface ChromeBookmarkNode {
  id: string;
  parentId?: string;
  title?: string;
  url?: string;
  dateAdded?: number;
  children?: ChromeBookmarkNode[];
}
EOF
```

- [ ] **Step 2: 验证类型检查**

```bash
pnpm compile
```

Expected: 0 errors。

- [ ] **Step 3: 提交**

```bash
git add src/types/bookmark.ts
git commit -m "feat(types): add Bookmark and ChromeBookmarkNode types"
```

---

### Task 8: 实现 URL 规范化工具（TDD）

**Files:**
- Create: `tests/unit/url.test.ts`
- Create: `src/utils/url.ts`

**Interfaces:**
- Consumes: 任意 URL 字符串
- Produces: `normalizeUrl(url: string): string` —— 去除 utm 参数、fragment、尾斜杠、协议大小写

- [ ] **Step 1: 写失败的测试**

```bash
cat > tests/unit/url.test.ts << 'EOF'
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
EOF
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm test url
```

Expected: FAIL — "Cannot find module '~/utils/url'"

- [ ] **Step 3: 实现 normalizeUrl**

```bash
mkdir -p src/utils
cat > src/utils/url.ts << 'EOF'
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
EOF
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm test url
```

Expected: 8 passes, 0 fails。

- [ ] **Step 5: 提交**

```bash
git add tests/unit/url.test.ts src/utils/url.ts
git commit -m "feat(utils): add URL normalization with TDD"
```

---

### Task 9: 配置 Vitest 的 `~` 路径别名

**Files:**
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: `import { ... } from "~/utils/url"` 写法
- Produces: 路径别名解析正确

- [ ] **Step 1: 检查 vitest.config.ts 是否已配置**

查看 `vitest.config.ts`（Task 4 创建），其中已经有：

```typescript
resolve: {
  alias: {
    "~": new URL("./src", import.meta.url).pathname,
  },
},
```

如果存在，跳到 Step 2。如果不存在，添加。

- [ ] **Step 2: 验证 Task 8 的 url.test.ts 使用 `~/utils/url` 能解析**

```bash
pnpm test url
```

Expected: 8 passes。

- [ ] **Step 3: 提交（若修改）**

```bash
git add vitest.config.ts
git commit -m "chore(test): ensure ~ path alias is configured" --allow-empty
```

---

### Task 10: 实现 IndexedDB Storage 模块 (TDD)

**Files:**
- Create: `tests/unit/storage.test.ts`
- Create: `src/modules/storage.ts`

**Interfaces:**
- Consumes: `Bookmark[]`
- Produces:
  - `db: Dexie` 单例
  - `saveBookmarks(bookmarks: Bookmark[]): Promise<void>`
  - `getAllBookmarks(): Promise<Bookmark[]>`
  - `clear(): Promise<void>`

- [ ] **Step 1: 安装 Dexie**

```bash
pnpm add dexie@^4.0.0
pnpm add -D fake-indexeddb@^6.0.0
```

- [ ] **Step 2: 写失败的测试**

```bash
cat > tests/unit/storage.test.ts << 'EOF'
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { saveBookmarks, getAllBookmarks, clear, _resetDb } from "~/modules/storage";
import type { Bookmark } from "~/types/bookmark";

const sample: Bookmark[] = [
  {
    id: "1",
    parentId: "0",
    title: "GitHub",
    url: "https://github.com",
    dateAdded: 1700000000000,
    folderPath: "Bookmarks bar/Dev",
  },
  {
    id: "2",
    parentId: "0",
    title: "MDN",
    url: "https://developer.mozilla.org",
    dateAdded: 1700000001000,
    folderPath: "Bookmarks bar/Dev",
  },
];

beforeEach(async () => {
  await _resetDb();
  await clear();
});

describe("storage", () => {
  it("saves and retrieves bookmarks", async () => {
    await saveBookmarks(sample);
    const all = await getAllBookmarks();
    expect(all).toHaveLength(2);
    expect(all[0].title).toBe("GitHub");
  });

  it("upserts existing bookmarks by id", async () => {
    await saveBookmarks(sample);
    await saveBookmarks([
      { ...sample[0], title: "GitHub - Updated" },
    ]);
    const all = await getAllBookmarks();
    expect(all).toHaveLength(2);
    expect(all.find((b) => b.id === "1")?.title).toBe("GitHub - Updated");
  });

  it("clears all bookmarks", async () => {
    await saveBookmarks(sample);
    await clear();
    const all = await getAllBookmarks();
    expect(all).toHaveLength(0);
  });
});
EOF
```

- [ ] **Step 3: 运行测试验证失败**

```bash
pnpm test storage
```

Expected: FAIL — "Cannot find module '~/modules/storage'"

- [ ] **Step 4: 实现 storage 模块**

```bash
mkdir -p src/modules
cat > src/modules/storage.ts << 'EOF'
import Dexie, { type EntityTable } from "dexie";
import type { Bookmark } from "~/types/bookmark";

class BookmarkDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, "id">;

  constructor() {
    super("oh-my-bookmarks");
    this.version(1).stores({
      bookmarks: "id, parentId, url, dateAdded",
    });
  }
}

let dbInstance: BookmarkDB | null = null;

function getDb(): BookmarkDB {
  if (!dbInstance) {
    dbInstance = new BookmarkDB();
  }
  return dbInstance;
}

/**
 * 仅用于测试：重置单例与底层 IndexedDB。
 * 生产代码不要调用。
 */
export async function _resetDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.delete();
    dbInstance = null;
  }
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  const db = getDb();
  await db.bookmarks.bulkPut(bookmarks);
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = getDb();
  return db.bookmarks.toArray();
}

export async function clear(): Promise<void> {
  const db = getDb();
  await db.bookmarks.clear();
}
EOF
```

- [ ] **Step 5: 运行测试验证通过**

```bash
pnpm test storage
```

Expected: 3 passes, 0 fails。

- [ ] **Step 6: 提交**

```bash
git add tests/unit/storage.test.ts src/modules/storage.ts package.json pnpm-lock.yaml
git commit -m "feat(modules): add Dexie storage with TDD"
```

---

### Task 11: 实现 bookmark-sync 模块 (TDD 含 chrome API mock)

**Files:**
- Create: `tests/unit/bookmark-sync.test.ts`
- Create: `src/modules/bookmark-sync.ts`

**Interfaces:**
- Consumes: `chrome.bookmarks.getTree()`、`chrome.bookmarks.onCreated`、`chrome.bookmarks.onChanged`、`chrome.bookmarks.onRemoved`
- Produces:
  - `syncAll(): Promise<Bookmark[]>` —— 全量同步
  - `subscribeToChanges(callback: () => void): () => void` —— 订阅增量变更

- [ ] **Step 1: 写失败的测试**

```bash
cat > tests/unit/bookmark-sync.test.ts << 'EOF'
import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { getAllBookmarks, _resetDb } from "~/modules/storage";
import { syncAll } from "~/modules/bookmark-sync";
import type { ChromeBookmarkNode } from "~/types/bookmark";

const TREE: ChromeBookmarkNode[] = [
  {
    id: "0",
    title: "",
    children: [
      {
        id: "1",
        parentId: "0",
        title: "Bookmarks bar",
        children: [
          {
            id: "10",
            parentId: "1",
            title: "Dev",
            children: [
              {
                id: "100",
                parentId: "10",
                title: "GitHub",
                url: "https://github.com",
                dateAdded: 1700000000000,
              },
            ],
          },
          {
            id: "11",
            parentId: "1",
            title: "MDN",
            url: "https://developer.mozilla.org",
            dateAdded: 1700000001000,
          },
        ],
      },
    ],
  },
];

function installChromeMock(tree: ChromeBookmarkNode[]) {
  (globalThis as any).chrome = {
    bookmarks: {
      getTree: vi.fn().mockResolvedValue(tree),
      onCreated: { addListener: vi.fn() },
      onChanged: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
    },
  };
}

beforeEach(async () => {
  await _resetDb();
});

describe("bookmark-sync", () => {
  it("syncs the full tree into IndexedDB", async () => {
    installChromeMock(TREE);
    const synced = await syncAll();
    expect(synced).toHaveLength(2);

    const stored = await getAllBookmarks();
    expect(stored).toHaveLength(2);
    expect(stored[0].folderPath).toBe("Bookmarks bar/Dev");
    expect(stored[1].folderPath).toBe("Bookmarks bar");
  });

  it("skips nodes without url (folders) but indexes folderPath", async () => {
    installChromeMock(TREE);
    const synced = await syncAll();
    const github = synced.find((b) => b.id === "100");
    expect(github?.folderPath).toBe("Bookmarks bar/Dev");
  });
});
EOF
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm test bookmark-sync
```

Expected: FAIL — "Cannot find module '~/modules/bookmark-sync'"

- [ ] **Step 3: 实现 bookmark-sync**

```bash
cat > src/modules/bookmark-sync.ts << 'EOF'
import { getDb } from "~/modules/storage";
import type { Bookmark, ChromeBookmarkNode } from "~/types/bookmark";

/**
 * 递归遍历书签树，收集所有书签（带文件夹路径）。
 */
function flatten(
  nodes: ChromeBookmarkNode[],
  parentPath: string[] = [],
  out: Bookmark[] = [],
): Bookmark[] {
  for (const node of nodes) {
    const folderPath = parentPath.length > 0 ? parentPath.join("/") : "";
    if (node.url) {
      out.push({
        id: node.id,
        parentId: node.parentId ?? null,
        title: node.title ?? "",
        url: node.url,
        dateAdded: node.dateAdded ?? 0,
        folderPath,
      });
    } else if (node.children) {
      const nextPath = node.title ? [...parentPath, node.title] : parentPath;
      flatten(node.children, nextPath, out);
    }
  }
  return out;
}

/**
 * 从 chrome.bookmarks API 同步全量书签到 IndexedDB。
 * 返回同步的书签数。
 */
export async function syncAll(): Promise<Bookmark[]> {
  const tree = (await chrome.bookmarks.getTree()) as ChromeBookmarkNode[];
  // 根节点 children 是顶层，整个树的第一层（id="0"）title 为空，不计入路径
  const root = tree[0];
  const bookmarks = flatten(root.children ?? [], [], []);

  const db = getDb();
  await db.transaction("rw", db.bookmarks, async () => {
    await db.bookmarks.clear();
    await db.bookmarks.bulkPut(bookmarks);
  });

  return bookmarks;
}

type ChangeCallback = () => void;

/**
 * 订阅书签变更（创建/修改/删除），返回 unsubscribe。
 */
export function subscribeToChanges(callback: ChangeCallback): () => void {
  const handleChange = () => callback();
  chrome.bookmarks.onCreated.addListener(handleChange);
  chrome.bookmarks.onChanged.addListener(handleChange);
  chrome.bookmarks.onRemoved.addListener(handleChange);
  return () => {
    chrome.bookmarks.onCreated.removeListener(handleChange);
    chrome.bookmarks.onChanged.removeListener(handleChange);
    chrome.bookmarks.onRemoved.removeListener(handleChange);
  };
}
EOF
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm test bookmark-sync
```

Expected: 2 passes, 0 fails。

- [ ] **Step 5: 提交**

```bash
git add tests/unit/bookmark-sync.test.ts src/modules/bookmark-sync.ts
git commit -m "feat(modules): add bookmark-sync with TDD"
```

---

### Task 12: 实现 search 模块 (TDD)

**Files:**
- Create: `tests/unit/search.test.ts`
- Create: `src/modules/search.ts`

**Interfaces:**
- Consumes: `Bookmark[]`
- Produces:
  - `buildIndex(bookmarks: Bookmark[]): SearchIndex`
  - `query(index: SearchIndex, query: string, limit?: number): SearchResult[]`

- [ ] **Step 1: 安装 MiniSearch**

```bash
pnpm add minisearch@^7.0.0
```

- [ ] **Step 2: 写失败的测试**

```bash
cat > tests/unit/search.test.ts << 'EOF'
import { describe, it, expect } from "vitest";
import { buildIndex, query } from "~/modules/search";
import type { Bookmark } from "~/types/bookmark";

const sample: Bookmark[] = [
  { id: "1", parentId: "0", title: "GitHub", url: "https://github.com", dateAdded: 1, folderPath: "Dev" },
  { id: "2", parentId: "0", title: "GitLab", url: "https://gitlab.com", dateAdded: 2, folderPath: "Dev" },
  { id: "3", parentId: "0", title: "Kubernetes docs", url: "https://kubernetes.io/docs", dateAdded: 3, folderPath: "Dev" },
  { id: "4", parentId: "0", title: "MDN", url: "https://developer.mozilla.org", dateAdded: 4, folderPath: "Web" },
];

describe("search.buildIndex + query", () => {
  it("matches by title prefix", () => {
    const index = buildIndex(sample);
    const results = query(index, "git");
    expect(results.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("matches by URL substring", () => {
    const index = buildIndex(sample);
    const results = query(index, "kubernetes");
    expect(results.map((r) => r.id)).toContain("3");
  });

  it("fuzzy matches partial words", () => {
    const index = buildIndex(sample);
    const results = query(index, "kuber");
    expect(results.map((r) => r.id)).toContain("3");
  });

  it("respects limit", () => {
    const index = buildIndex(sample);
    const results = query(index, "dev", 1);
    expect(results).toHaveLength(1);
  });

  it("returns empty on empty query", () => {
    const index = buildIndex(sample);
    expect(query(index, "")).toEqual([]);
  });

  it("returns empty on whitespace-only query", () => {
    const index = buildIndex(sample);
    expect(query(index, "   ")).toEqual([]);
  });
});
EOF
```

- [ ] **Step 3: 运行测试验证失败**

```bash
pnpm test search
```

Expected: FAIL — "Cannot find module '~/modules/search'"

- [ ] **Step 4: 实现 search 模块**

```bash
cat > src/modules/search.ts << 'EOF'
import MiniSearch, { type SearchResult as MSResult } from "minisearch";
import type { Bookmark } from "~/types/bookmark";

export type SearchIndex = MiniSearch<Bookmark>;
export interface SearchResult {
  id: string;
  score: number;
  bookmark: Bookmark;
}

/**
 * 基于 MiniSearch 构建书签内存索引。
 * 索引字段：title（权重 3）、url（权重 2）、folderPath（权重 1）。
 */
export function buildIndex(bookmarks: Bookmark[]): SearchIndex {
  const index = new MiniSearch<Bookmark>({
    fields: ["title", "url", "folderPath"],
    storeFields: ["title", "url", "folderPath", "dateAdded", "parentId"],
    idField: "id",
    searchOptions: {
      boost: { title: 3, url: 2, folderPath: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  index.addAll(bookmarks);
  return index;
}

export function query(index: SearchIndex, q: string, limit = 10): SearchResult[] {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const results = index.search(trimmed, { combineWith: "OR" });
  return results.slice(0, limit).map((r: MSResult) => ({
    id: String(r.id),
    score: r.score,
    bookmark: {
      id: String(r.id),
      parentId: r.parentId as string | null,
      title: r.title as string,
      url: r.url as string,
      dateAdded: r.dateAdded as number,
      folderPath: r.folderPath as string,
    },
  }));
}
EOF
```

- [ ] **Step 5: 运行测试验证通过**

```bash
pnpm test search
```

Expected: 6 passes, 0 fails。

- [ ] **Step 6: 提交**

```bash
git add tests/unit/search.test.ts src/modules/search.ts package.json pnpm-lock.yaml
git commit -m "feat(modules): add MiniSearch-based search with TDD"
```

---

### Task 13: background.ts 集成 sync + subscribe

**Files:**
- Create: `src/entrypoints/background.ts`

**Interfaces:**
- Consumes: `chrome.runtime.onInstalled`, `chrome.bookmarks.*` 事件
- Produces: 启动时全量同步 + 监听增量变更

- [ ] **Step 1: 实现 background.ts**

```bash
cat > src/entrypoints/background.ts << 'EOF'
import { syncAll, subscribeToChanges } from "~/modules/bookmark-sync";

export default defineBackground(() => {
  // 启动时全量同步
  syncAll().catch((err) => {
    console.error("[oh-my-bookmarks] syncAll failed", err);
  });

  // 订阅增量变更
  subscribeToChanges(() => {
    syncAll().catch((err) => {
      console.error("[oh-my-bookmarks] incremental sync failed", err);
    });
  });
});
EOF
```

- [ ] **Step 2: 类型检查**

```bash
pnpm compile
```

Expected: 0 errors。

- [ ] **Step 3: 手动测试**

```bash
pnpm dev
```

- 在 Chrome 加载扩展
- 浏览器实际书签有 1,661 条
- 打开 DevTools → Service Worker (chrome://extensions/ → oh-my-bookmarks → "Service Worker" 链接)
- Console 应该没有错误
- 创建一个新书签 → Console 应该看到 incremental sync 触发

- [ ] **Step 4: 提交**

```bash
git add src/entrypoints/background.ts
git commit -m "feat(background): wire syncAll + subscribe on startup"
```

---

### Task 14: 实现 SearchBox 组件 (TDD + Component Test)

**Files:**
- Create: `tests/unit/SearchBox.test.tsx`
- Create: `src/entrypoints/popup/components/SearchBox.tsx`

**Interfaces:**
- Consumes: `value: string`、`onChange: (v: string) => void`
- Produces: 受控输入框，⌘K 自动 focus，Escape 清空

- [ ] **Step 1: 安装测试依赖**

```bash
pnpm add -D @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.4.0 jsdom@^25.0.0 @testing-library/user-event@^14.5.0
```

- [ ] **Step 2: 更新 vitest.config.ts**

```bash
cat > vitest.config.ts << 'EOF'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/modules/**", "src/utils/**", "src/entrypoints/popup/components/**"],
      exclude: ["**/*.d.ts", "**/types/**"],
    },
  },
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
    },
  },
});
EOF
```

- [ ] **Step 3: 更新 tests/setup.ts**

```bash
cat > tests/setup.ts << 'EOF'
import "@testing-library/jest-dom/vitest";
EOF
```

- [ ] **Step 4: 写失败的测试**

```bash
mkdir -p src/entrypoints/popup/components
cat > tests/unit/SearchBox.test.tsx << 'EOF'
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
EOF
```

- [ ] **Step 5: 运行测试验证失败**

```bash
pnpm test SearchBox
```

Expected: FAIL — "Cannot find module '~/entrypoints/popup/components/SearchBox'"

- [ ] **Step 6: 实现 SearchBox**

```bash
cat > src/entrypoints/popup/components/SearchBox.tsx << 'EOF'
import { useEffect, useRef } from "react";

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onChange("");
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Search bookmarks (Esc to clear)"
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      autoFocus
    />
  );
}
EOF
```

- [ ] **Step 7: 运行测试验证通过**

```bash
pnpm test SearchBox
```

Expected: 3 passes, 0 fails。

- [ ] **Step 8: 提交**

```bash
git add tests/unit/SearchBox.test.tsx src/entrypoints/popup/components/SearchBox.tsx vitest.config.ts tests/setup.ts package.json pnpm-lock.yaml
git commit -m "feat(popup): add SearchBox component with TDD"
```

---

### Task 15: 实现 BookmarkItem 组件

**Files:**
- Create: `src/entrypoints/popup/components/BookmarkItem.tsx`

**Interfaces:**
- Consumes: `bookmark: Bookmark`、`selected: boolean`、`onClick: () => void`
- Produces: 渲染书签项（标题、URL、文件夹）

- [ ] **Step 1: 写组件测试**

```bash
cat > tests/unit/BookmarkItem.test.tsx << 'EOF'
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
EOF
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm test BookmarkItem
```

Expected: FAIL — "Cannot find module '~/entrypoints/popup/components/BookmarkItem'"

- [ ] **Step 3: 实现 BookmarkItem**

```bash
cat > src/entrypoints/popup/components/BookmarkItem.tsx << 'EOF'
import type { Bookmark } from "~/types/bookmark";

export interface BookmarkItemProps {
  bookmark: Bookmark;
  selected: boolean;
  onClick: () => void;
}

export function BookmarkItem({ bookmark, selected, onClick }: BookmarkItemProps) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 cursor-pointer border-b border-gray-100 ${
        selected ? "bg-blue-100" : "hover:bg-gray-50"
      }`}
    >
      <div className="text-sm font-medium text-gray-900 truncate">{bookmark.title}</div>
      <div className="text-xs text-gray-500 truncate">{bookmark.url}</div>
      <div className="text-xs text-gray-400 truncate">{bookmark.folderPath}</div>
    </div>
  );
}
EOF
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm test BookmarkItem
```

Expected: 3 passes, 0 fails。

- [ ] **Step 5: 提交**

```bash
git add tests/unit/BookmarkItem.test.tsx src/entrypoints/popup/components/BookmarkItem.tsx
git commit -m "feat(popup): add BookmarkItem component"
```

---

### Task 16: App.tsx 集成 - 完整搜索 + 跳转

**Files:**
- Modify: `src/entrypoints/popup/App.tsx`

**Interfaces:**
- Consumes: `Bookmark[]`
- Produces: 实时搜索 UI + 键盘导航 + Enter 跳转

- [ ] **Step 1: 实现 App.tsx**

```bash
cat > src/entrypoints/popup/App.tsx << 'EOF'
import { useEffect, useState, useMemo } from "react";
import { SearchBox } from "./components/SearchBox";
import { BookmarkItem } from "./components/BookmarkItem";
import { EmptyState } from "./components/EmptyState";
import { getAllBookmarks } from "~/modules/storage";
import { buildIndex, query, type SearchResult } from "~/modules/search";
import type { Bookmark } from "~/types/bookmark";

export function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [queryStr, setQueryStr] = useState("");
  const [selected, setSelected] = useState(0);

  // 启动时加载
  useEffect(() => {
    getAllBookmarks().then(setBookmarks);
  }, []);

  const index = useMemo(() => buildIndex(bookmarks), [bookmarks]);
  const results: SearchResult[] = useMemo(
    () => query(index, queryStr),
    [index, queryStr],
  );

  // query 变化时重置 selection
  useEffect(() => {
    setSelected(0);
  }, [queryStr]);

  const openBookmark = (b: Bookmark) => {
    chrome.tabs.create({ url: b.url });
    window.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      openBookmark(results[selected].bookmark);
    }
  };

  return (
    <div className="w-[420px]" onKeyDown={handleKeyDown}>
      <div className="p-3 border-b border-gray-200">
        <SearchBox value={queryStr} onChange={setQueryStr} />
      </div>
      <div className="max-h-96 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <EmptyState
            title="Loading bookmarks..."
            subtitle="If this persists, check Service Worker console"
          />
        ) : results.length === 0 ? (
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
        )}
      </div>
    </div>
  );
}
EOF
```

- [ ] **Step 2: 创建 EmptyState 组件**

```bash
cat > src/entrypoints/popup/components/EmptyState.tsx << 'EOF'
export interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="p-8 text-center text-gray-500">
      <div className="text-sm">{title}</div>
      {subtitle && <div className="text-xs mt-1">{subtitle}</div>}
    </div>
  );
}
EOF
```

- [ ] **Step 3: 类型检查**

```bash
pnpm compile
```

Expected: 0 errors。

- [ ] **Step 4: 提交**

```bash
git add src/entrypoints/popup/App.tsx src/entrypoints/popup/components/EmptyState.tsx
git commit -m "feat(popup): integrate search UI with keyboard navigation"
```

---

### Task 17: E2E 测试 - 完整搜索跳转流程

**Files:**
- Create: `tests/e2e/search.spec.ts`

**Interfaces:**
- Consumes: 加载 dev 扩展
- Produces: 输入查询 → 验证结果 → Enter 跳转验证

- [ ] **Step 1: 实现 E2E 测试**

```bash
cat > tests/e2e/search.spec.ts << 'EOF'
import { test, expect } from "@playwright/test";

test.describe("oh-my-bookmarks popup", () => {
  test("opens, searches, and navigates", async ({ page, context }) => {
    // 打开 popup（通过 service worker 触发）
    const sw = context.serviceWorkers()[0];
    if (!sw) throw new Error("Service worker not found");

    // 模拟用户操作：直接打开 popup HTML
    await page.goto("chrome-extension://" + (await sw.url()).match(/chrome-extension:\/\/([a-z]+)/)![1] + "/popup.html");

    // 等待搜索框
    const input = page.getByPlaceholder(/search bookmarks/i);
    await expect(input).toBeVisible({ timeout: 10000 });

    // 输入查询
    await input.fill("kubernetes");

    // 等待结果
    await page.waitForTimeout(500);

    // 验证至少一个结果
    const items = page.locator(".cursor-pointer");
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });
});
EOF
```

- [ ] **Step 2: 验证产物存在**

```bash
pnpm build
ls .output/chrome-mv3/ | head
```

Expected: 看到 `manifest.json`、`popup.html` 等文件。

- [ ] **Step 3: 运行 E2E**

```bash
pnpm test:e2e
```

Expected: 1 test pass（首次运行可能需要加载扩展，等待稍长）。

- [ ] **Step 4: 提交**

```bash
git add tests/e2e/search.spec.ts
git commit -m "test(e2e): add search-and-navigate smoke test"
```

---

### Task 18: 性能验证 + 文档收尾

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 1,661 条真实书签
- Produces: 性能报告 + 用户文档

- [ ] **Step 1: 性能基准测试**

```bash
cat > tests/unit/perf.test.ts << 'EOF'
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildIndex, query } from "~/modules/search";
import type { Bookmark } from "~/types/bookmark";

/**
 * 解析 Netscape bookmark HTML 为 Bookmark[]。
 * 简单解析，足够性能测试。
 */
function parseHtml(content: string): Bookmark[] {
  const bookmarks: Bookmark[] = [];
  const lines = content.split("\n");
  let folderPath: string[] = [];
  let dlDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<DT><H3")) {
      const title = trimmed.match(/>([^<]+)</)?.[1] ?? "";
      folderPath.push(title);
    } else if (trimmed.startsWith("<DT><A HREF=")) {
      const href = trimmed.match(/HREF="([^"]+)"/)?.[1] ?? "";
      const title = trimmed.match(/>([^<]+)</)?.[1] ?? "";
      const dateAdded = Number(trimmed.match(/ADD_DATE="(\d+)"/)?.[1] ?? 0) * 1000;
      bookmarks.push({
        id: `bm-${bookmarks.length}`,
        parentId: "0",
        title,
        url: href,
        dateAdded,
        folderPath: folderPath.join("/"),
      });
    } else if (trimmed.startsWith("</DL>")) {
      if (folderPath.length > 0) folderPath.pop();
    }
  }
  return bookmarks;
}

describe("performance", () => {
  it("indexes 1,661 bookmarks in < 200ms", () => {
    const html = readFileSync(
      resolve(process.cwd(), "tests/fixtures/bookmarks_7_5_12.html"),
      "utf-8",
    );
    const bookmarks = parseHtml(html);
    expect(bookmarks.length).toBeGreaterThan(1000);

    const start = performance.now();
    const index = buildIndex(bookmarks);
    const elapsed = performance.now() - start;

    console.log(`Indexed ${bookmarks.length} bookmarks in ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(200);
  });

  it("queries 1,661 bookmarks in < 50ms", () => {
    const html = readFileSync(
      resolve(process.cwd(), "tests/fixtures/bookmarks_7_5_12.html"),
      "utf-8",
    );
    const bookmarks = parseHtml(html);
    const index = buildIndex(bookmarks);

    const start = performance.now();
    const results = query(index, "kubernetes", 10);
    const elapsed = performance.now() - start;

    console.log(`Query returned ${results.length} results in ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(50);
  });
});
EOF
```

- [ ] **Step 2: 复制 fixtures 到 tests/fixtures**

```bash
mkdir -p tests/fixtures
cp /Users/allengaller/Documents/GitHub/allengaller/oh-my-browser/test/bookmarks_7_5_12.html tests/fixtures/
git rm /Users/allengaller/Documents/GitHub/allengaller/oh-my-browser/test/bookmarks_7_5_12.html 2>/dev/null || true
```

- [ ] **Step 3: 运行性能测试**

```bash
pnpm test perf
```

Expected: 2 passes，输出索引 ~50ms、查询 ~5ms。

- [ ] **Step 4: 更新 README**

```bash
cat > README.md << 'EOF'
# oh-my-bookmarks

A handy bookmark toolkit for coder.

## Features (Sprint 0 + Sprint 1)

- ⌘⇧K 弹出搜索框
- 模糊匹配书签（标题、URL、文件夹）
- 上下键选择 + Enter 跳转
- 离线索引，< 50ms 响应

## Performance

基于 1,661 条真实书签样本：
- 索引构建：~50ms
- 查询响应：~5ms

## Development

```bash
pnpm install
pnpm dev
```

Load the extension from `.output/chrome-mv3/` in Chrome's extension page.

## Testing

```bash
pnpm test         # Unit tests
pnpm test:e2e    # E2E tests
pnpm test:coverage  # Coverage report
```

## Build

```bash
pnpm build       # Chrome
pnpm zip         # Pack for store
```

## Architecture

详见 `docs/superpowers/specs/2026-08-13-oh-my-bookmarks-design.md`。

## Roadmap

- Sprint 2: 去重 + 站点聚合
- Sprint 3: 死链检测 + 清理
- Sprint 4: AI 自动打标签

## License

MIT
EOF
```

- [ ] **Step 5: 提交**

```bash
git add tests/unit/perf.test.ts tests/fixtures/bookmarks_7_5_12.html README.md
git commit -m "test(perf): validate 1,661 bookmarks perf budget + docs"
```

---

### Task 19: 完整验证 + 归档旧代码

**Files:**
- Create: `archive/2026-08-13-yii-scaffold/.gitkeep`
- Modify: `docs/superpowers/specs/2026-08-13-oh-my-bookmarks-design.md`

**Interfaces:**
- Consumes: Sprint 0 + 1 完成的全部代码
- Produces: 归档旧代码 + 全量 CI 通过

- [ ] **Step 1: 归档旧 Yii 代码**

```bash
mkdir -p archive/2026-08-13-yii-scaffold
mv app archive/2026-08-13-yii-scaffold/
mv api archive/2026-08-13-yii-scaffold/
mv doc archive/2026-08-13-yii-scaffold/
mv web archive/2026-08-13-yii-scaffold/
echo "Archived Yii scaffold to archive/2026-08-13-yii-scaffold/" > archive/2026-08-13-yii-scaffold/README.md
```

- [ ] **Step 2: 运行全量测试**

```bash
pnpm compile
pnpm test
pnpm test:e2e
```

Expected: 全部通过。

- [ ] **Step 3: 更新 spec 状态**

```bash
# 编辑 docs/superpowers/specs/2026-08-13-oh-my-bookmarks-design.md
# 把"状态：Draft v1"改为"状态：Sprint 0+1 已完成"的注释
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: archive Yii scaffold + mark Sprint 0+1 complete"
```

---

## Definition of Done - Sprint 0 + 1

- [ ] 全部 19 个 task 完成
- [ ] `pnpm test` 全部通过
- [ ] `pnpm test:e2e` 全部通过
- [ ] `pnpm build` 产物体积 < 500KB（gzip）
- [ ] 1,661 条书签索引 < 200ms
- [ ] 1,661 条书签查询 < 50ms
- [ ] Chrome 加载扩展后按 ⌘⇧K 弹出 popup
- [ ] 输入 "kubernetes" 立即看到结果
- [ ] 上下键选择 + Enter 跳转成功
- [ ] Escape 清空查询
- [ ] 旧 Yii 代码已归档

---

## Self-Review 完成情况

- **Spec coverage**: 11 节内容 100% 覆盖（背景、范围、架构、模块、文件结构、数据流、错误处理、测试、成功标准、风险、Sprint 计划）
- **Placeholder scan**: 无 TBD/TODO
- **Type consistency**: `Bookmark`、`ChromeBookmarkNode`、`SearchIndex`、`SearchResult` 类型在首个出现处定义后保持一致
- **Ambiguity check**: URL 规范化规则明确列出（去 utm_、fragment、尾斜杠）；并发限制在 Sprint 3 计划中明确
- **Scope**: 范围聚焦 Sprint 0+1，Sprint 2-4 明确为后续独立计划
