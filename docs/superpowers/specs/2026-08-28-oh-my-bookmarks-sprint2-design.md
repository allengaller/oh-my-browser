# Oh My Bookmarks Sprint 2 设计：去重 + 站点聚合（含技术债）

> **状态**：Draft v1（brainstorming 评审通过，待用户最终评审）

## 1. 背景与目标

### 1.1 背景

Sprint 1（即时搜索）已完成并合并到 master，CI test job 全绿。Sprint 2 交付两大块：

1. **核心功能**（spec 原始规划）：去重 + 站点聚合。对 `bookmarks_7_5_12.html` 的样本分析显示：19 个 URL 重复（1.2%）、140 条 solidot 子域（同一站点散落多文件夹）——用户需要"一键看到重复 + 按站点聚合"的增强视图。
2. **技术债**（final review 起点清单 #1/#5）：
   - 根治 wxt 0.19 `modulesDir` hack（Sprint 1 Task 17 workaround，遗留自 Sprint 1）
   - E2E CI 修复（headless Chromium MV3 SW 限制，当前 `continue-on-error: true`）

### 1.2 目标

- 用户打开 popup 即可看到：重复 URL 分组列表 + 站点聚合列表（含条数、跨文件夹标记）
- 移除 wxt hack，`pnpm build` 无 workaround 通过
- E2E 恢复为 CI 硬性 gate（移除 `continue-on-error`）

### 1.3 成功标准

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 1,661 条样本扫描（重复 + 站点聚合）< 50ms | `perf.test.ts` |
| 2 | 样本中 19 个重复 URL 全部检出 | `dedup.test.ts`（fixture 断言） |
| 3 | solidot.org 子域聚合成一组 | `dedup.test.ts` |
| 4 | `pnpm build` 通过且 wxt.config.ts 无 hack | CI + code review |
| 5 | e2e job 在 CI 通过（无 `continue-on-error`） | GitHub Actions |

---

## 2. 范围与非目标

### 2.1 范围

| 功能 | 说明 |
|------|------|
| 技术债：wxt hack 根治 | `src/modules/` → `src/lib/`，删除 `modulesDir` hack |
| 技术债：E2E CI 修复 | xvfb + 非 headless 模式，移除 `continue-on-error` |
| 去重扫描 | `scanDuplicates(bookmarks)`：按规范化 URL 精确分组 |
| 站点聚合 | `scanSites(bookmarks)`：按 eTLD+1 聚合 |
| popup tab UI | 搜索 / 去重 / 站点 三个 tab |

### 2.2 非目标（YAGNI）

- ❌ 重复书签的合并/删除操作（只展示；延续"chrome.bookmarks 唯一真源，扩展只做增强视图"原则）
- ❌ 后台定时扫描（popup 打开时实时计算，1,661 条 < 50ms 无需持久化）
- ❌ Options page、Privacy policy（延后到 Sprint 3）
- ❌ 死链检测、AI 打标签（Sprint 3/4）

---

## 3. 架构

### 3.1 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 去重算法 | **精确 Map**（替代 spec 草案的 BloomFilter） | 1,661 条数据 Map 内存可忽略（~100KB）；零误报；可直接列出重复分组（BloomFilter 只能"可能重复"需二次回查，UI 无法直接分组）；无需哈希序列化/持久化。BloomFilter 适用千万级，本项目 YAGNI |
| 站点聚合 | **tldts** 提取 eTLD+1 | 准确处理 `co.uk`/`com.cn` 等多级公共后缀；spec 已批准 |
| 数据流 | **纯函数实时计算** | `dedup.ts` 无状态；popup 打开时从 IndexedDB 读全量 → 实时 scan；不写库、不后台扫描 |
| 展示位置 | **popup 内 tab**（搜索/去重/站点） | 用户无需打开设置页即可看到结果；无 router，React state 切换 |
| 修改行为 | **只读展示** | 不修改 chrome.bookmarks；去重结果仅供用户参考，删除操作留待 Sprint 3 清理功能 |

### 3.2 数据流

```
popup 打开
  → App.tsx 从 IndexedDB 读全部 bookmarks（getAllBookmarks）
  → dedup.scanDuplicates(bookmarks)  → 去重 tab 渲染
  → dedup.scanSites(bookmarks)       → 站点 tab 渲染
```

纯函数、无副作用、无持久化。

---

## 4. 组件与模块

### 4.1 文件变更清单

**技术债（Task A）：wxt hack 根治**

- Rename: `src/modules/` → `src/lib/`（bookmark-sync.ts, search.ts, storage.ts）
- Modify: 全部 `~/modules/*` → `~/lib/*` import（src + tests，约 9 处）
- Modify: `wxt.config.ts` — 删除 `modulesDir: "./wxt-modules"` 及注释
- 验证：`pnpm build` 成功（无 hack）

**技术债（Task B）：E2E CI 修复**

- Modify: `playwright.config.ts` — CI 用 `headless: false`（由 `xvfb-run` 包裹）
- Modify: `.github/workflows/ci.yml` — e2e job 加 `xvfb-run -a` 前缀，移除 `continue-on-error: true`
- Modify: `tests/e2e/search.spec.ts` — `launchPersistentContext` 的 headless 参数按环境切换

**核心功能（Task C）：siteKey**

- Modify: `src/lib/url.ts` — 新增 `siteKey(url: string): string | null`（tldts 提取 eTLD+1；无效 URL 返回 null）
- Add dep: `tldts`
- Test: `tests/unit/url.test.ts` 扩展 siteKey 用例

**核心功能（Task D）：dedup 模块**

- Create: `src/lib/dedup.ts`
- 接口：
  ```typescript
  export interface DuplicateGroup {
    normalizedUrl: string; // 分组的规范化 URL（展示用原始 URL 列表）
    count: number; // 重复条数（≥2）
    bookmarks: Bookmark[]; // 组内书签
    folders: string[]; // 涉及的去重后文件夹列表
    crossFolder: boolean; // 是否跨文件夹
  }
  export interface SiteGroup {
    siteKey: string; // eTLD+1，如 "solidot.org"
    count: number; // 该站点书签数
    bookmarks: Bookmark[];
    folders: string[];
    crossFolder: boolean;
  }
  export function scanDuplicates(bookmarks: Bookmark[]): DuplicateGroup[];
  export function scanSites(bookmarks: Bookmark[]): SiteGroup[];
  ```
- 行为：
  - `scanDuplicates`：按 `normalizeUrl(url)` 分组，仅返回 count ≥ 2 的组，按 count 降序
  - `scanSites`：按 `siteKey(url)` 分组（null 忽略），按 count 降序，全量返回
  - 排序稳定性：count 相同按 siteKey/normalizedUrl 字典序（确定性，便于测试）
- Test: `tests/unit/dedup.test.ts` + `tests/unit/perf.test.ts` 扩展

**核心功能（Task E）：popup tab UI**

- Modify: `src/entrypoints/popup/App.tsx` — 加 tab state（search | duplicates | sites）
- Create: `src/entrypoints/popup/components/TabBar.tsx` — tab 切换栏
- Create: `src/entrypoints/popup/components/DuplicatesView.tsx` — 重复分组列表（点击跳转第一个）
- Create: `src/entrypoints/popup/components/SitesView.tsx` — 站点聚合列表（条数徽标 + 跨文件夹标记，点击展开子项）
- Modify: `src/entrypoints/popup/style.css` — tab 样式
- Test: 组件测试（tab 切换、列表渲染、空状态）

### 4.2 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| `lib/url.ts` | normalizeUrl（已有）+ siteKey（新增） | tldts |
| `lib/dedup.ts` | 重复扫描 + 站点聚合（纯函数） | lib/url.ts |
| popup tab 组件 | 展示去重/聚合结果（只读） | lib/dedup.ts, chrome.tabs |

---

## 5. 错误处理

| 场景 | 行为 |
|------|------|
| URL 解析失败（非法 URL） | `normalizeUrl` 返回原样；`siteKey` 返回 null（聚合忽略） |
| 空书签库 / 无重复 | 去重 tab 显示空状态"没有重复书签" |
| 站点无 eTLD+1（如 `localhost`） | `siteKey` 返回 null，不参与聚合 |
| IndexedDB 读取失败 | 沿用 Sprint 1 错误处理（tab 显示错误提示） |
| tldts 无法解析 | 返回 null，不抛异常 |

---

## 6. 测试策略

| 层级 | 工具 | 覆盖 |
|------|------|------|
| Unit | Vitest | `dedup.test.ts`：重复分组（同 URL 不同 query 归一、跨文件夹标记、空输入、无重复）、站点聚合（子域合并、多级后缀、排序）；`url.test.ts`：siteKey 用例 |
| Perf | Vitest | 1,661 条 fixture：`scanDuplicates` + `scanSites` 合计 < 50ms |
| Component | Testing Library | TabBar 切换、DuplicatesView 渲染、SitesView 展开 |
| E2E | Playwright + xvfb | 打开 popup → 切 tab → 看到去重/站点结果（CI 硬性 gate） |

**fixtures**：复用 `tests/fixtures/bookmarks_7_5_12.html`（已解析为 Bookmark[] 的 fixture 在 perf.test.ts 中已有）。

---

## 7. 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| `src/modules/` → `src/lib/` 改动面（import 全量更新） | 低 | 9 处引用，compile + test + build 三重验证 |
| xvfb 在 CI 不可用 | 中 | ubuntu-latest 预装 xvfb；fallback 方案：GitHub Actions `xvfb-run` 包 |
| tldts bundle 体积 | 低 | tldts 无依赖纯 JS，gzip ~10KB，对 580KB build 影响可忽略 |
| tab UI 增加 popup 复杂度 | 低 | 无 router，纯 state 切换；组件拆分保持单一职责 |

---

## 8. Sprint 2 计划（Task 草案，writing-plans 细化）

| Task | 内容 | 依赖 |
|------|------|------|
| A | wxt hack 根治（modules → lib + 删 hack + build 验证） | 无 |
| B | E2E CI 修复（xvfb + headless: false + 移除 continue-on-error） | A（build 依赖） |
| C | siteKey（tldts 依赖 + url.ts 扩展 + 测试） | A |
| D | dedup.ts（scanDuplicates + scanSites + 测试 + perf） | C |
| E | popup tab UI（TabBar + DuplicatesView + SitesView + 测试） | D |
| F | 收官：全量验证 + spec 状态更新 + CI 验证 | A-E |

每个 task 的 acceptance criteria 必须显式包含 `pnpm build` 验证（Sprint 1 教训）。

---

## 9. 自审记录

- **Spec coverage**：6 节内容覆盖背景、范围、架构、模块、错误处理、测试、成功标准、风险、计划
- **Placeholder scan**：无 TBD/TODO
- **Type consistency**：`Bookmark` 复用 Sprint 1 类型；`DuplicateGroup`/`SiteGroup` 在本 spec 定义后一致
- **Ambiguity check**：排序规则（count 降序 + 字典序 tie-breaker）、siteKey 无效返回 null、去重只读不写均已明确
- **Scope**：聚焦 Sprint 2；Options page/Privacy policy/死链/AI 标签明确延后
