import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SimpleAuthForm } from "@/components/auth/simple-auth-form";
import { Alert } from "@/components/ui/alert";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Indique ton adresse : nous t'enverrons un lien pour choisir un nouveau mot de passe."
      footer={
        <Link href="/login" className="text-accent-text hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      {isDemoMode() ? (
        <Alert tone="warning">La réinitialisation du mot de passe nécessite Supabase. Elle est indisponible en mode démo.</Alert>
      ) : (
        <SimpleAuthForm action={requestPasswordResetAction} field="email" submitLabel="Envoyer le lien" />
      )}
    </AuthShell>
  );
}
