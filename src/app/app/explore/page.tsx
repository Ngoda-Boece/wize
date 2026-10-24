import type { Metadata } from "next";
import { StartSessionForm } from "@/components/app/start-session-form";
import { ModeIcon } from "@/components/mode-icon";
import { SectionTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";
import { MODE_INFO } from "@/lib/labels";
import { defaultModeFor, suggestionsFor } from "@/lib/personalization";
import { MODES, type Mode } from "@/lib/types";

export const metadata: Metadata = { title: "Explorer" };

const WHEN_TO_USE: Record<Mode, string> = {
  sparring: "Tu as une opinion et tu veux savoir si elle tient face à un contradicteur sérieux.",
  mentor: "Tu découvres un domaine et tu veux une progression claire, avec des exemples.",
  socratic: "Tu veux construire ta propre réponse plutôt que la recevoir toute faite.",
  laboratory: "Tu veux voir comment une idée se comporte en situation, décision après décision.",
};

export default async function ExplorePage() {
  const viewer = await requireViewer("/app/explore");
  const repo = await getRepository(viewer);
  const [profile, objectives] = await Promise.all([repo.getProfile(), repo.listObjectives()]);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Nouvelle session</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Choisis un sujet et la façon dont tu veux travailler. Tu pourras changer de mode à tout moment pendant la session.
        </p>
      </header>

      <StartSessionForm
        defaultMode={defaultModeFor(profile)}
        suggestions={suggestionsFor(profile, 7)}
        objectives={objectives.filter((o) => o.status !== "completed")}
        showModeDetails
        autoFocus
      />

      <section aria-labelledby="which-mode" className="space-y-3">
        <SectionTitle id="which-mode">Quel mode choisir ?</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <li key={m} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ModeIcon mode={m} className="h-4 w-4 text-accent-text" />
                {MODE_INFO[m].label}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{WHEN_TO_USE[m]}</p>
              <p className="mt-3 border-l-2 border-border pl-3 text-[13px] italic leading-relaxed text-subtle">« {MODE_INFO[m].opening} »</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
