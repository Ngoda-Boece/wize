import { FlaskConical, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { aiStatus } from "@/lib/ai";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const viewer = await requireViewer("/app");
  const profile = await (await getRepository(viewer)).getProfile();
  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const ai = aiStatus();
  const notice =
    viewer.kind === "demo" || ai !== "anthropic" ? (
      <div
        role="status"
        className={`flex items-start gap-2 border-b px-4 py-2 text-[13px] sm:items-center sm:px-6 ${
          ai === "unconfigured" ? "border-danger/20 bg-danger-soft text-danger" : "border-warning-text/15 bg-warning-soft text-warning-text"
        }`}
      >
        {ai === "unconfigured" ? (
          <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
        ) : (
          <FlaskConical aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
        )}
        <span>
          {viewer.kind === "demo" ? "Mode démo : tes données sont temporaires. " : null}
          {ai === "mock"
            ? "Les réponses de Wize sont simulées (aucune clé Anthropic configurée)."
            : ai === "unconfigured"
              ? "Le service d'IA n'est pas configuré : les conversations sont indisponibles."
              : "Les réponses sont générées par Claude."}
        </span>
      </div>
    ) : null;

  const userLabel = profile.displayName || viewer.email || (viewer.kind === "demo" ? "Visiteur démo" : "Mon compte");
  return (
    <AppShell userLabel={userLabel} notice={notice}>
      {children}
    </AppShell>
  );
}
