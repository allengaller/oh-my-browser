export interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="p-8 text-center text-gray-500">
      <div className="text-sm">{title}</div>
      {subtitle && <div className="text-xs mt-1">{subtitle}</div>}
    </div>
  );
}
