import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "error" | "success" | "warning";

const styles: Record<Tone, string> = {
  info: "border-border bg-surface-2 text-muted",
  error: "border-danger/30 bg-danger-soft text-danger",
  success: "border-mint/40 bg-mint-soft text-mint-text",
  warning: "border-warning-text/20 bg-warning-soft text-warning-text",
};

export function Alert({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const Icon = tone === "success" ? CircleCheck : tone === "info" ? Info : TriangleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-sm leading-relaxed", styles[tone], className)}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
