import { ArrowRight, Compass, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ObjectivesManager } from "@/components/app/objectives-manager";
import { SavedSummaries } from "@/components/app/saved-summaries";
import { StatTiles } from "@/components/app/stat-tiles";
import { WeeklyActivity } from "@/components/app/weekly-activity";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";

export const metadata: Metadata = { title: "Progression" };

export default async function ProgressPage() {
  const viewer = await requireViewer("/app/progress");
  const repo = await getRepository(viewer);
  const [stats, objectives, summaries] = await Promise.all([repo.getStats(), repo.listObjectives(), repo.listSummaries({ limit: 12 })]);
  // Suggested next steps come only from the user's own saved summaries.
  const nextSteps = summaries
    .flatMap((s) => s.summary.nextSteps.map((step) => ({ step, conversationId: s.conversationId, title: s.conversationTitle })))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Progression</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Ce que tu as réellement exploré et consolidé. Ces indicateurs comptent tes sessions et tes synthèses ; ils ne mesurent pas ton intelligence.
        </p>
      </header>

      {stats.sessionsTotal === 0 ? (
        <Card className="p-6 sm:p-8">
          <Sparkles aria-hidden className="h-5 w-5 text-accent-text" />
          <h2 className="mt-3 text-lg font-semibold tracking-tight">Ta progression commence avec ta première session</h2>
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted marker:text-subtle">
            <li>Lance une session sur un sujet qui t&apos;intéresse.</li>
            <li>Échange avec Wize jusqu&apos;à avoir clarifié quelques idées.</li>
            <li>Génère et enregistre une synthèse : tes concepts revus et tes prochaines étapes apparaîtront ici.</li>
          </ol>
          <ButtonLink href="/app/explore" className="mt-6">
            <Compass aria-hidden className="h-4 w-4" /> Lancer une session
          </ButtonLink>
        </Card>
      ) : (
        <>
          <StatTiles stats={stats} />
          <section aria-labelledby="activity-title" className="space-y-3">
            <SectionTitle id="activity-title">Sessions lancées par semaine</SectionTitle>
            <Card className="p-4 pt-8 sm:p-6 sm:pt-10">
              <WeeklyActivity weeks={stats.weeklySessions} />
            </Card>
          </section>
        </>
      )}

      <section aria-labelledby="concepts-title" className="space-y-3">
        <SectionTitle id="concepts-title">Concepts revus récemment</SectionTitle>
        {stats.recentConcepts.length ? (
          <ul className="flex flex-wrap gap-2">
            {stats.recentConcepts.map((c) => (
              <li key={`${c.conversationId}-${c.concept}`}>
                <Link href={`/app/chat/${c.conversationId}`} title={`Session : ${c.conversationTitle}`} className="rounded-md">
                  <Badge tone="accent" className="px-2.5 py-1 text-[13px] hover:opacity-80">
                    {c.concept}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Les concepts clés de tes synthèses enregistrées apparaîtront ici.</p>
        )}
      </section>

      <section aria-labelledby="objectives-title">
        <ObjectivesManager initial={objectives} />
      </section>

      <section aria-labelledby="summaries-title" className="space-y-3">
        <SectionTitle id="summaries-title">Synthèses enregistrées</SectionTitle>
        <SavedSummaries initial={summaries} />
      </section>

      {nextSteps.length ? (
        <section aria-labelledby="next-title" className="space-y-3">
          <SectionTitle id="next-title">Prochaines étapes suggérées</SectionTitle>
          <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
            {nextSteps.map((n, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                <span>{n.step}</span>
                <Link
                  href={`/app/chat/${n.conversationId}`}
                  className="inline-flex shrink-0 items-center gap-1 text-accent-text hover:underline"
                  aria-label={`Reprendre « ${n.title} »`}
                >
                  Reprendre <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
