import { FlaskConical, GraduationCap, MessageCircleQuestionMark, Swords, type LucideIcon } from "lucide-react";
import type { Mode } from "@/lib/types";

export const MODE_ICONS: Record<Mode, LucideIcon> = {
  sparring: Swords,
  mentor: GraduationCap,
  socratic: MessageCircleQuestionMark,
  laboratory: FlaskConical,
};

export function ModeIcon({ mode, className }: { mode: Mode; className?: string }) {
  const Icon = MODE_ICONS[mode];
  return <Icon aria-hidden className={className ?? "h-4 w-4"} />;
}
