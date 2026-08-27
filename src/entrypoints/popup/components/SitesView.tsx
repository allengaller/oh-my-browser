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
