import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SimpleAuthForm } from "@/components/auth/simple-auth-form";
import { updatePasswordAction } from "@/lib/actions/auth";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

// Reached through the e-mail link: /auth/confirm establishes the session first.
export default async function ResetPasswordPage() {
  await requireViewer("/reset-password");
  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisis un mot de passe que tu n'utilises pas ailleurs.">
      <SimpleAuthForm action={updatePasswordAction} field="password" submitLabel="Enregistrer" />
    </AuthShell>
  );
}
