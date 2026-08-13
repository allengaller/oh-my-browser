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
