import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enterDemoAction } from "@/lib/actions/auth";

/** Shown instead of the login form when Supabase is not configured. */
export function DemoPanel({ next }: { next?: string }) {
  return (
    <form action={enterDemoAction} className="space-y-4">
      <div className="flex gap-3 rounded-[10px] bg-warning-soft p-3.5 text-sm text-warning-text">
        <FlaskConical aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong className="font-semibold">Mode démo.</strong> Supabase n&apos;est pas configuré : les comptes réels sont
          désactivés. Tu peux explorer Wize avec un espace temporaire, effacé au redémarrage du serveur.
        </p>
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" className="w-full" size="lg">
        Entrer dans la démo
      </Button>
    </form>
  );
}
