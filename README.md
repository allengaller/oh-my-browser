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
