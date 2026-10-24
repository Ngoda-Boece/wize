import type { ProgressStats } from "@/lib/types";

/** Four honest counters computed from persisted data only. */
export function StatTiles({ stats }: { stats: ProgressStats }) {
  const tiles = [
    { label: "Sujets explorés", value: stats.subjectsExplored, hint: "sujets distincts" },
    { label: "Sessions terminées", value: stats.sessionsCompleted, hint: `sur ${stats.sessionsTotal} lancée${stats.sessionsTotal > 1 ? "s" : ""}` },
    { label: "Objectifs actifs", value: stats.objectivesActive, hint: `${stats.objectivesCompleted} terminé${stats.objectivesCompleted > 1 ? "s" : ""}` },
    { label: "Concepts revus", value: stats.conceptsReviewed, hint: "issus de tes synthèses" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="bg-surface px-4 py-4 sm:px-5">
          <dt className="text-[13px] text-muted">{t.label}</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{t.value}</span>
            <span className="truncate text-xs text-subtle">{t.hint}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
