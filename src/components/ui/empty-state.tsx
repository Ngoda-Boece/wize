import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
