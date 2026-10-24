import type { ProgressStats } from "@/lib/types";

const weekLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/**
 * Sessions started per week (8 weeks). Single series: one accent color, no
 * legend (the title names it). Each column is a focusable hit target larger
 * than the bar, with a tooltip on hover/focus; a table gives screen readers
 * the same data.
 */
export function WeeklyActivity({ weeks }: { weeks: ProgressStats["weeklySessions"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <figure>
      <div className="flex h-36 items-end gap-[2px] border-b border-border" aria-hidden>
        {weeks.map((w) => {
          const label = `Semaine du ${weekLabel.format(new Date(w.weekStart))} : ${w.count} session${w.count > 1 ? "s" : ""}`;
          return (
            <div key={w.weekStart} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center rounded-t-md outline-none hover:bg-sunken/60 focus-visible:bg-sunken/60">
              <div
                className="w-full max-w-9 rounded-t-[4px] bg-accent"
                style={{ height: w.count ? `${Math.max(4, (w.count / max) * 100)}%` : "0%" }}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg shadow-card group-hover:block group-focus-visible:block"
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[11px] text-subtle" aria-hidden>
        {weeks.map((w, i) => (
          <span key={w.weekStart} className="flex-1 text-center">
            {i === 0 || i === weeks.length - 1 || i === Math.floor(weeks.length / 2) ? weekLabel.format(new Date(w.weekStart)) : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Sessions lancées par semaine</caption>
        <thead>
          <tr>
            <th scope="col">Semaine du</th>
            <th scope="col">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.weekStart}>
              <td>{weekLabel.format(new Date(w.weekStart))}</td>
              <td>{w.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
