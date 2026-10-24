import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { DemoPanel } from "@/components/auth/demo-panel";
import { Alert } from "@/components/ui/alert";
import { signInAction } from "@/lib/actions/auth";
import { safeNext } from "@/lib/auth/safe-next";
import { getViewer } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getViewer()) redirect(next);
  const demo = isDemoMode();

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Reprends là où tu t'étais arrêté."
      footer={
        demo ? null : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-medium text-accent-text hover:underline">
              Créer un compte
            </Link>
          </>
        )
      }
    >
      {params.error === "lien" ? (
        <Alert tone="error" className="mb-4">
          Ce lien est invalide ou a expiré. Demande-en un nouveau.
        </Alert>
      ) : null}
      {demo ? (
        <DemoPanel next={next !== "/app" ? next : undefined} />
      ) : (
        <CredentialsForm action={signInAction} variant="login" next={next} />
      )}
    </AuthShell>
  );
}
