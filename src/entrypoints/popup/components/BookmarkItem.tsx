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
