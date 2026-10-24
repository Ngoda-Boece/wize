"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { AuthFormState } from "@/lib/actions/auth";

/** Single-field form used for the password reset request and the new password. */
export function SimpleAuthForm({
  action,
  field,
  submitLabel,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  field: "email" | "password";
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {field === "email" ? (
        <Field label="Adresse e-mail" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
      ) : (
        <Field label="Nouveau mot de passe" htmlFor="password" hint="8 caractères minimum.">
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Un instant…" : submitLabel}
      </Button>
    </form>
  );
}
