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
