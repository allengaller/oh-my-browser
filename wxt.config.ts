import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "./src",
  // wxt 0.19 默认扫描 src/modules/ 作为 user modules 目录（通过 jiti 加载），
  // jiti 不识 tsconfig path aliases（如 `~/modules/...`），与项目的 src/modules/ 命名冲突。
  // 指向一个不存在的目录以禁用 wxt 的 user modules 自动扫描；项目代码仍按 src/modules/ 正常组织。
  modulesDir: "./wxt-modules",
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
