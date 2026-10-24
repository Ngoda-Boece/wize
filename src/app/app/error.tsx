"use client";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
        <TriangleAlert aria-hidden className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Quelque chose s&apos;est mal passé</h1>
      <p className="mt-2 text-sm text-muted">Cette page n&apos;a pas pu être chargée. Tes données ne sont pas affectées.</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <ButtonLink href="/app" variant="secondary">
          Tableau de bord
        </ButtonLink>
      </div>
    </div>
  );
}
