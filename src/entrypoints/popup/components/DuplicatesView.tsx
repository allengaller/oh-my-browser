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
            {g.crossFolder && <span className="text-[10px] text-amber-600 shrink-0">跨文件夹</span>}
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
