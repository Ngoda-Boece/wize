import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[var(--radius-card)] border border-border bg-surface shadow-soft", className)} {...props} />;
}

export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-[15px] font-semibold tracking-tight text-fg", className)} {...props} />;
}
