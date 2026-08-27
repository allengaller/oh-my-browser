import { syncAll, subscribeToChanges } from "~/lib/bookmark-sync";

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
