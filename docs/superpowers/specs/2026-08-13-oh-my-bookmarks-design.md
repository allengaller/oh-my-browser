# oh-my-bookmarks 设计文档

**日期**：2026-08-13
**状态**：Sprint 0-2 已完成
**作者**：Qoder × allengaller

---

## 1. 背景与动机

### 1.1 项目起源

原仓库 `oh-my-browser` 包含一个名为 "Bookmarkit" 的早期项目（2013–2015），技术栈为 Yii 2 Advanced Project Template。仓库审计表明：

- 1,661 条真实用户书签样本保存在 `test/bookmarks_7_5_12.html`（2012-03-30 ~ 2012-07-04）
- 全部业务代码（书签 Model、导入逻辑、API Controller）从未实现
- 文档全部为占位符
- 最后一次提交 2015-08-17，已停止维护 10 年

经过评估，原项目本质上只有 Yii 脚手架 + 一份调试中的 Python 2 脚本 + 真实样本数据。

### 1.2 样本数据洞察

对 `bookmarks_7_5_12.html` 的全量分析揭示产品方向：

| 指标 | 数值 | 启示 |
|------|------|------|
| 1,661 条书签 / 44 个文件夹 | 中等规模个人用户 | 真实需求场景 |
| 96% 协议为 http | 2012 年老站点 | 死链检测刚需 |
| 19 个 URL 重复（1.2%） | 跨文件夹冗余 | 去重功能有价值 |
| 140 条 solidot 子域 | 同一站点散落多文件夹 | 站点聚合有价值 |
| TAGS=0，但标题含 `**tags:**` 前缀 | 缺乏轻量标签系统 | 自动打标签有价值 |
| 文件 1.2MB 含 12% base64 favicon | 输出格式需优化 | URL 化存储 |

### 1.3 目标

打造一个浏览器扩展，让用户能够：
1. 快速搜索并跳转 1,000+ 书签（高日活场景）
2. 自动发现并清理死链
3. 让 AI 自动打标签弥补历史缺失
4. 去除重复 / 聚合同站点

---

## 2. 范围与非目标

### 2.1 范围（4 个 Sprint 分阶段交付）

> **澄清**：严格意义上 **MVP = Sprint 1**（即时搜索）。Sprint 2-4 是后续迭代（V1.1 / V1.2），但都已纳入同一规划以保证架构连贯性。

| 功能 | Sprint | 阶段 |
|------|--------|--------|
| 即时搜索 + 快速跳转 | Sprint 1 | 🟢 MVP 必须 |
| 去重 + 站点聚合 | Sprint 2 | 🟡 V1.1 |
| 死链检测 + 清理 | Sprint 3 | 🟡 V1.1 |
| AI 自动打标签 | Sprint 4 | 🟡 V1.2 |

### 2.2 非目标（YAGNI）

- ❌ 云端书签同步（用户用浏览器自带同步即可）
- ❌ 多人协作 / 共享书签
- ❌ 书签导入 Pocket / Raindrop（只支持 Netscape 导出格式）
- ❌ 浏览器内置 AI 助手（暂用 Cloudflare Workers AI）
- ❌ 暗色模式（V1.3 才考虑）
- ❌ 国际化（先 English + 中文混排）

---

## 3. 架构

### 3.1 系统架构图

```
┌──────────────────────────────────────────────────────────┐
│             Browser Extension (Manifest V3)              │
│                                                          │
│  ┌──────────────────┐  ┌────────────────────────────┐    │
│  │  Popup UI        │  │  Options Page              │    │
│  │  ⌘⇧K 弹出搜索    │  │  主题、快捷键、AI 配额     │    │
│  │  即时搜索跳转    │  │  同步状态、清理            │    │
│  └──────────────────┘  └────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Background Service Worker (TypeScript)          │    │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐   │    │
│  │  │ bookmark   │ │  dedup     │ │  dead-link  │   │    │
│  │  │ sync       │ │  scanner   │ │  checker    │   │    │
│  │  └────────────┘ └────────────┘ └─────────────┘   │    │
│  │  ┌────────────┐ ┌──────────────────────────┐     │    │
│  │  │ search     │ │  ai-tagger (CF Workers AI)│     │    │
│  │  │ index      │ │  批量 / 缓存 / 退避       │     │    │
│  │  └────────────┘ └──────────────────────────┘     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Storage                                         │    │
│  │  chrome.bookmarks        → 真实书签（只读）       │    │
│  │  chrome.storage.sync     → 设置、用户标签        │    │
│  │  IndexedDB               → 搜索索引、死链报告    │    │
│  │                             AI 标签缓存           │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (仅 AI 标签时调用)
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Cloudflare Worker (Workers AI: Llama 3.1 8B)           │
│  POST /api/tag   { titles[], urls[] }  →  { tags[][] }  │
│  免费额度 10K neurons/天，缓存命中率 >95% 后成本忽略不计  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 关键决策

- **chrome.bookmarks 为唯一真源**，扩展只做"增强视图"，不修改原始书签
- **AI 标签为副数据**（缓存），不写回 chrome.bookmarks（避免污染其他设备同步）
- **离线优先**：所有功能（搜索/去重/死链）不依赖网络
- **Cloudflare Workers AI**：免费额度充足、边缘部署、无需 Key 管理

---

## 4. 组件与模块

### 4.1 模块清单

| 模块 | 职责 | 依赖 |
|------|------|------|
| `bookmark-sync.ts` | 增量同步 chrome.bookmarks 到 IndexedDB | chrome.bookmarks API |
| `search.ts` | MiniSearch 索引 + 查询 | MiniSearch |
| `dedup.ts` | URL 规范化 + Bloom filter 查重 | tldts, BloomFilter |
| `dead-link.ts` | HEAD 请求扫描 + 报告生成 | fetch + AbortController |
| `ai-tagger.ts` | 批量调用 CF Workers AI + 缓存 | fetch |
| `storage.ts` | Dexie 封装的 IndexedDB schema | Dexie |

### 4.2 文件结构

```
oh-my-bookmarks/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts            # Service Worker 入口
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   ├── App.tsx
│   │   │   └── style.css
│   │   └── options/                # 设置页
│   ├── modules/
│   │   ├── bookmark-sync.ts
│   │   ├── search.ts
│   │   ├── dedup.ts
│   │   ├── dead-link.ts
│   │   ├── ai-tagger.ts
│   │   └── storage.ts
│   ├── components/
│   │   ├── SearchBox.tsx
│   │   ├── BookmarkItem.tsx
│   │   ├── DuplicateGroup.tsx
│   │   └── DeadLinkReport.tsx
│   └── utils/
│       ├── url.ts                  # 规范化
│       ├── keyboard.ts
│       └── psl.ts
├── workers/                        # Cloudflare Worker
│   ├── src/index.ts
│   ├── wrangler.toml
│   └── package.json
├── tests/
│   ├── unit/                       # Vitest
│   └── e2e/                        # Playwright Extension
├── wxt.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 4.3 技术栈

| 用途 | 选型 | 理由 |
|------|------|------|
| 扩展框架 | WXT | Manifest V3 首选，HMR 快 |
| UI | Preact + Tailwind 4 | 轻量（3KB） |
| 搜索 | MiniSearch | 纯 JS，零依赖 |
| 存储 | Dexie.js | IndexedDB 优雅封装 |
| URL 规范化 | tldts | 准确 eTLD+1 |
| 去重 | BloomFilter | 1,661 条 ~2KB |
| 死链检测 | fetch HEAD + AbortController | 浏览器原生 |
| 测试 | Vitest + Playwright | Unit + E2E |

---

## 5. 数据流

### 5.1 启动流程

```
extension install / update
  → background.ts 初始化 Dexie schema
  → bookmark-sync 读取 chrome.bookmarks 全量
  → search.buildIndex()
  → dedup.scan()
```

### 5.2 书签变更

```
chrome.bookmarks.onCreated/Changed/Removed
  → 增量更新 IndexedDB
  → 增量更新 search index
  → 增量更新 dedup map
```

### 5.3 搜索流程

```
用户输入 (popup)
  → MiniSearch 查询（< 50ms）
  → 渲染 Top 10 命中
  → Enter 跳转 / 上下键选择
```

### 5.4 死链扫描

```
用户在 options 触发
  → 并发 6 个 fetch HEAD + AbortController(5s)
  → 写入 dead_links 表
  → UI 报告 + 批量删除按钮
```

### 5.5 AI 标签

```
新书签触发（增量）
  → 批量 50 条/请求 → CF Workers AI
  → 写入 ai_tags 表，带 timestamp + URL hash
  → 二次启动命中缓存（>95%）
```

---

## 6. 错误处理

| 异常 | 处理 |
|------|------|
| `chrome.bookmarks` API 失败 | 退避重试 3 次，失败显示降级提示 |
| 死链 HEAD 超时 | 标记为 "timeout"，不列入死链（保守） |
| AI 接口 429 限流 | 指数退避 + 队列延时 + UI 提示"限流中" |
| AI 接口 5xx | 重试 2 次，失败则跳过该批次 |
| IndexedDB 配额满 | 提示用户清理死链报告 |
| URL 解析失败 | 跳过该书签，记录到 errors 表 |

---

## 7. 测试策略

| 层级 | 工具 | 覆盖重点 |
|------|------|----------|
| Unit | Vitest | URL 规范化、去重算法、搜索评分 |
| Component | Vitest + Testing Library | SearchBox、BookmarkItem 渲染 |
| E2E | Playwright Extension | "打开扩展 → 输入 → 跳转"完整链路 |
| Manual | - | 真实 1,661 条数据回归 |

**fixtures 数据**：使用 `test/bookmarks_7_5_12.html` 作为种子数据集。

---

## 8. 成功标准（Definition of Done）

| 指标 | 目标 |
|------|------|
| Chrome Web Store 上架 | ✅ 通过审核 |
| 1,661 条书签搜索响应 | < 50ms |
| 1,661 条死链扫描耗时 | < 2 分钟 |
| AI 标签二次复用命中率 | > 95% |
| Bundle size | < 500KB（gzip） |
| Lighthouse 扩展评分 | > 90 |
| 单元测试覆盖率 | > 80% |

---

## 9. 风险与回退

| 风险 | 回退方案 |
|------|----------|
| WXT 框架不成熟 | 退到 vanilla Manifest V3 |
| CF Workers AI 限流 | 降级到 chrome built-in Prompt API（实验性） |
| Chrome Web Store 审核被拒 | 改 Firefox AMO 或自托管 .crx |
| tldts 解析错误 | fallback 到手写规则 + 大量测试用例 |

---

## 10. Sprint 计划

| Sprint | 周期 | 交付物 | 可演示 |
|--------|------|--------|--------|
| **0. Setup** | 1 天 | WXT + TS + Tailwind 项目骨架，CI 工作流 | `pnpm dev` 弹出一个 Hello popup |
| **1. 即时搜索 + 快速跳转** | 3-4 天 | ⌘⇧K 弹出搜索框，模糊匹配，Enter 跳转 | 搜索 "kubernetes" 0.05s 命中跳转 |
| **2. 去重 + 站点聚合** | 3-4 天 | URL 规范化、Bloom filter 查重、按 eTLD+1 聚合 | 一键看到 19 个重复 + 140 个 solidot 子域聚合 |
| **3. 死链检测 + 清理** | 4-5 天 | 后台 HEAD 扫描、并发 6、5s 超时、报告 + 批量删除 | 1,661 个书签 2 分钟内扫描完，列出 600+ 死链 |
| **4. AI 自动打标签** | 5-7 天 | Cloudflare Worker + Llama 3.1 8B 批量打标签、缓存、UI 展示 | 输入 100 个新书签，秒级返回标签建议 |

**总工期：3-4 周** 到 Chrome Web Store 可上架版本。

---

## 11. 附录

### 11.1 仓库迁移决策

- 原 `app/`、`api/v1/` Yii 代码：归档到 `archive/2026-08-13-yii-scaffold/`
- 原 `doc/3d/` 占位文档：归档到 `archive/2026-08-13-old-docs/`
- 保留 `test/bookmarks_7_5_12.html` 作为 fixtures（seed data）
- **新仓库命名**：建议新建 `oh-my-bookmarks` 仓库（与 `oh-my-browser` 区分），待用户确认后实施
- 旧仓库 `oh-my-browser` 转为只读模式，注明"已迁移至 oh-my-bookmarks"

### 11.2 参考资料

- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [WXT Framework](https://wxt.dev/)
- [MiniSearch](https://lucaong.github.io/minisearch/)
- [Dexie.js](https://dexie.org/)
