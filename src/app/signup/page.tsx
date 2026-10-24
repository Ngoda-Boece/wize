import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { DemoPanel } from "@/components/auth/demo-panel";
import { signUpAction } from "@/lib/actions/auth";
import { getViewer } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage() {
  if (await getViewer()) redirect("/app");
  const demo = isDemoMode();
  return (
    <AuthShell
      title="Commence à réfléchir"
      subtitle="Crée ton compte en quelques secondes. Aucune information superflue."
      footer={
        demo ? null : (
          <>
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-accent-text hover:underline">
              Se connecter
            </Link>
          </>
        )
      }
    >
      {demo ? <DemoPanel /> : <CredentialsForm action={signUpAction} variant="signup" />}
    </AuthShell>
  );
}
