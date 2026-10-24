import type { Metadata } from "next";
import Link from "next/link";
import { DangerZone, PreferencesForm } from "@/components/profile/settings-forms";
import { Card } from "@/components/ui/card";
import { aiStatus } from "@/lib/ai";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";
import { supabaseSecretKey } from "@/lib/env";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/app/settings");
  const profile = await (await getRepository(viewer)).getProfile();
  const ai = aiStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Paramètres</h1>
        <p className="mt-2 text-muted">{viewer.kind === "demo" ? "Espace de démonstration temporaire." : `Connecté avec ${viewer.email ?? "ton compte"}.`}</p>
      </header>

      <section aria-labelledby="prefs-title" className="space-y-3">
        <h2 id="prefs-title" className="text-[15px] font-semibold tracking-tight">
          Préférences d&apos;apprentissage
        </h2>
        <Card className="p-5 sm:p-6">{profile ? <PreferencesForm profile={profile} /> : null}</Card>
      </section>

      <section aria-labelledby="data-title" className="space-y-3">
        <h2 id="data-title" className="text-[15px] font-semibold tracking-tight">
          Tes données
        </h2>
        <Card className="space-y-3 p-5 text-sm leading-relaxed text-muted sm:p-6">
          <p>Wize conserve uniquement :</p>
          <ul className="list-disc space-y-1 pl-5 marker:text-subtle">
            <li>ton profil d&apos;apprentissage (les informations ci-dessus) ;</li>
            <li>tes sessions : titre, sujet, mode et messages ;</li>
            <li>les synthèses que tu enregistres et les objectifs que tu crées.</li>
          </ul>
          <p>
            {ai === "anthropic"
              ? "Pour répondre, les derniers messages de la session (et ton profil si la personnalisation est activée) sont envoyés à Anthropic (Claude)."
              : "Aucune donnée n'est envoyée à un fournisseur d'IA : les réponses sont simulées sur ce serveur."}{" "}
            Le contenu de tes messages n&apos;est pas écrit dans les journaux techniques.
          </p>
          <p>
            Tu peux supprimer une conversation depuis l&apos;historique, et une synthèse depuis la page Progression. Plus de détails dans la{" "}
            <Link href="/privacy" className="text-accent-text underline underline-offset-2">
              politique de confidentialité
            </Link>
            .
          </p>
        </Card>
      </section>

      <section aria-labelledby="danger-title" className="space-y-3">
        <h2 id="danger-title" className="text-[15px] font-semibold tracking-tight">
          Suppression
        </h2>
        <DangerZone canDeleteAuthAccount={viewer.kind === "supabase" && supabaseSecretKey() !== null} isDemo={viewer.kind === "demo"} />
      </section>
    </div>
  );
}
