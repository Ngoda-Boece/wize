import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "mint" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-muted",
  accent: "bg-accent-soft text-accent-text",
  mint: "bg-mint-soft text-mint-text",
  warning: "bg-warning-soft text-warning-text",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}
