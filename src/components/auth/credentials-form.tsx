"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { AuthFormState } from "@/lib/actions/auth";

type Props = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  variant: "login" | "signup";
  next?: string;
};

export function CredentialsForm({ action, variant, next }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const isSignup = variant === "signup";

  if (state?.message) return <Alert tone="success">{state.message}</Alert>;

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {isSignup ? (
        <Field label="Prénom ou pseudo (facultatif)" htmlFor="displayName">
          <Input id="displayName" name="displayName" autoComplete="given-name" maxLength={80} />
        </Field>
      ) : null}
      <Field label="Adresse e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.email} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" hint={isSignup ? "8 caractères minimum." : undefined}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
      </Field>
      {!isSignup ? (
        <p className="text-right text-sm">
          <Link href="/forgot-password" className="text-accent-text hover:underline">
            Mot de passe oublié ?
          </Link>
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Un instant…" : isSignup ? "Créer mon compte" : "Se connecter"}
      </Button>
    </form>
  );
}
