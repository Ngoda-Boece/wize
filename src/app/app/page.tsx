import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RecentSessions } from "@/components/app/recent-sessions";
import { StartSessionForm } from "@/components/app/start-session-form";
import { StatTiles } from "@/components/app/stat-tiles";
import { SectionTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";
import { defaultModeFor, greetingName, suggestionsFor } from "@/lib/personalization";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const viewer = await requireViewer("/app");
  const repo = await getRepository(viewer);
  const [profile, recent, objectives, stats] = await Promise.all([
    repo.getProfile(),
    repo.listConversations({ limit: 5, offset: 0 }),
    repo.listObjectives(),
    repo.getStats(),
  ]);
  const name = greetingName(profile);
  const openObjectives = objectives.filter((o) => o.status !== "completed");
  const objectiveTitles = Object.fromEntries(objectives.map((o) => [o.id, o.title]));
  const isNew = stats.sessionsTotal === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <p className="text-sm text-muted">{name ? `Bonjour ${name},` : "Bonjour,"}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Prêt à faire travailler tes idées ?</h1>
      </header>

      <StartSessionForm
        defaultMode={defaultModeFor(profile)}
        suggestions={suggestionsFor(profile)}
        objectives={openObjectives}
      />

      <section aria-labelledby="recent-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle id="recent-title">Sessions récentes</SectionTitle>
          {recent.items.length ? (
            <Link href="/app/history" className="inline-flex items-center gap-1 text-sm text-accent-text hover:underline">
              Tout voir <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
        <RecentSessions initial={recent.items} objectiveTitles={objectiveTitles} />
      </section>

      <section aria-labelledby="progress-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle id="progress-title">Ta progression</SectionTitle>
          <Link href="/app/progress" className="inline-flex items-center gap-1 text-sm text-accent-text hover:underline">
            Détails <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
        {isNew ? (
          <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface/60 p-5 text-sm text-muted">
            <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
            <p>
              Rien à mesurer pour l&apos;instant, et c&apos;est normal. Ta progression se construit à partir de tes vraies sessions :
              termine une conversation par une synthèse et les concepts revus apparaîtront ici.
            </p>
          </div>
        ) : (
          <StatTiles stats={stats} />
        )}
      </section>
    </div>
  );
}
