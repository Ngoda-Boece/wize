"use client";
import { Button } from "@/components/ui/button";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenu" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
      <p className="mt-3 max-w-sm text-muted">La page n&apos;a pas pu s&apos;afficher. Réessaie dans un instant.</p>
      <Button onClick={reset} className="mt-6">
        Réessayer
      </Button>
    </main>
  );
}
