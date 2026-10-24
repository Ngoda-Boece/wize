import { Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SUMMARY_SECTIONS } from "@/lib/summary-format";
import type { SummaryContent } from "@/lib/types";

export function SummaryView({ summary }: { summary: SummaryContent }) {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">Question centrale</p>
        <p className="mt-1 text-[15px] font-medium text-fg">{summary.centralQuestion}</p>
      </div>
      {summary.initialHypothesis ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-subtle">Hypothèse de départ</p>
          <p className="mt-1 text-muted">{summary.initialHypothesis}</p>
        </div>
      ) : null}
      {SUMMARY_SECTIONS.map(({ key, label }) => {
        const items = summary[key];
        if (!Array.isArray(items) || !items.length) return null;
        return (
          <div key={key}>
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">{label}</p>
            {key === "keyConcepts" ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {items.map((c) => (
                  <li key={c}>
                    <Badge tone="accent">{c}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-fg marker:text-subtle">
                {items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <div className="rounded-xl border border-mint/40 bg-mint-soft/60 p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-mint-text">
          <Dumbbell aria-hidden className="h-3.5 w-3.5" /> Exercice
        </p>
        <p className="mt-1.5 text-fg">{summary.exercise}</p>
      </div>
    </div>
  );
}
