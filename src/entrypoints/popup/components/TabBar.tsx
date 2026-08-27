export type Tab = "search" | "duplicates" | "sites";

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "search", label: "搜索" },
  { id: "duplicates", label: "去重" },
  { id: "sites", label: "站点" },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex border-b border-gray-200" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            active === t.id
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
