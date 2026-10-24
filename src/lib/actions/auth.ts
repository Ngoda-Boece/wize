"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth/safe-next";
import { DEMO_COOKIE, getViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";
import { appUrl, isDemoMode } from "@/lib/env";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation";

export type AuthFormState = { error?: string; message?: string; email?: string } | null;

/** Maps Supabase auth errors to friendly French messages without leaking details. */
function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Confirme d'abord ton adresse e-mail grâce au lien reçu.";
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cette adresse. Connecte-toi.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Choisis-en un plus long ou plus varié.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Trop de tentatives. Patiente quelques minutes.";
    case "same_password":
      return "Le nouveau mot de passe doit être différent de l'ancien.";
    default:
      return "Une erreur est survenue. Réessaie.";
  }
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (isDemoMode()) return { error: "La connexion par e-mail nécessite Supabase. Utilise le mode démo." };
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides.", email };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error.code), email };
  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (isDemoMode()) return { error: "La création de compte nécessite Supabase. Utilise le mode démo." };
  const email = String(formData.get("email") ?? "");
  const parsed = credentialsSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides.", email };
  const displayName = z.string().trim().max(80).safeParse(formData.get("displayName") ?? "").data ?? "";

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${appUrl()}/auth/confirm?next=/onboarding`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) return { error: authErrorMessage(error.code), email };
  // With e-mail confirmation disabled, Supabase returns a session immediately.
  if (data.session) redirect("/onboarding");
  return { message: "Compte créé. Ouvre le lien envoyé par e-mail pour confirmer ton adresse, puis connecte-toi.", email };
}

export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (isDemoMode()) return { error: "La réinitialisation nécessite Supabase." };
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Adresse e-mail invalide." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error && error.code?.startsWith("over_")) return { error: authErrorMessage(error.code) };
  // Same message whether or not the account exists (no account enumeration).
  return { message: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé." };
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (isDemoMode()) return { error: "Indisponible en mode démo." };
  const parsed = credentialsSchema.shape.password.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mot de passe invalide." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: authErrorMessage(error.code) };
  redirect("/app");
}

export async function enterDemoAction(formData: FormData) {
  if (!isDemoMode()) redirect("/login");
  const store = await cookies();
  if (!store.get(DEMO_COOKIE)) {
    store.set(DEMO_COOKIE, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  redirect(safeNext(formData.get("next"), "/onboarding"));
}

export async function signOutAction() {
  if (isDemoMode()) (await cookies()).delete(DEMO_COOKIE);
  else await (await createSupabaseServerClient()).auth.signOut();
  redirect("/");
}

export type DeleteAccountResult = { ok: false; error: string };

/**
 * Deletes all of the user's data. With a Supabase secret key configured, the
 * auth account itself is deleted too (cascading every table). Without it, the
 * data is erased and the user is signed out, and the UI explains that the
 * login identifier remains until an administrator removes it.
 */
export async function deleteAccountAction(): Promise<DeleteAccountResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  try {
    const repo = await getRepository(viewer);
    await repo.deleteAllData();
    if (viewer.kind === "demo") {
      (await cookies()).delete(DEMO_COOKIE);
      redirect("/?compte=supprime");
    }
    const admin = createSupabaseAdminClient();
    let fullyDeleted = false;
    if (admin) {
      const { error } = await admin.auth.admin.deleteUser(viewer.id);
      fullyDeleted = !error;
    }
    await (await createSupabaseServerClient()).auth.signOut();
    redirect(fullyDeleted ? "/?compte=supprime" : "/?compte=donnees-supprimees");
  } catch (err) {
    unstable_rethrow(err); // let redirect() propagate
    return { ok: false, error: "La suppression a échoué. Réessaie ou contacte le support." };
  }
}
